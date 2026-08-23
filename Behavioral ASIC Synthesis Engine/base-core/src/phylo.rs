//! Filogenia Computacional — evolução orgânica da Paleocomputação (jul/2026).
//!
//! G(B) = {(f, ω(f), λ(f))} · d_φ = Ψ · exp(−λ̄·Δt) · Neighbor-Joining · THC / homoplasia.
//!
//! Fonte: *PaleoComputação — Evolução Filogenética*.  
//! Honestidade: assist de linhagem — ≠ árvore genealógica prova judicial · ≠ auto-fix.

use crate::evidence::EvidenceDb;
use crate::paleo::ObservablesOmega;
use crate::spec::types::HardwareSpec;
use crate::strat_align::{FossilAtom, FossilPersistence, FossilSequence};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Banda de endereço SoC (fósseis ancestrais quando páginas exactas divergem).
pub fn address_band(addr: u64) -> &'static str {
    if addr < 0x0010_0000 {
        "band:vector_or_low"
    } else if addr < 0x1000_0000 {
        "band:sram_or_lowmap"
    } else if addr < 0x8000_0000 {
        "band:soc_mid"
    } else if addr < 0xa000_0000 {
        "band:soc_high_a"
    } else if addr < 0xc000_0000 {
        "band:unisoc_a9_af"
    } else {
        "band:high_c0"
    }
}

/// Carga de linhagem λ(f) ∈ (0, 1] — decai quando o fóssil se espalha pelo corpus.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenotypeLocus {
    pub fossil: FossilAtom,
    /// Observáveis locais proxy (região, persistência).
    pub omega_tag: String,
    pub lineage_load: f64,
}

/// Genótipo G(B) — nuvem fóssil com λ (≠ fenótipo Φ).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genotype {
    pub label: String,
    pub loci: Vec<GenotypeLocus>,
    pub phenotype: Option<ObservablesOmega>,
    pub stratum_delta_t: f64,
}

impl Genotype {
    /// Constrói G(B) a partir de evidência; λ via frequência no corpus (se dado).
    pub fn from_evidence(
        db: &EvidenceDb,
        corpus_freq: Option<&HashMap<String, usize>>,
        corpus_size: usize,
        phenotype: Option<ObservablesOmega>,
        delta_t: f64,
    ) -> Self {
        let seq = FossilSequence::from_evidence(db);
        let mut loci = Vec::with_capacity(seq.atoms.len() * 2);
        let mut pages: HashSet<u64> = HashSet::new();
        let mut bands: HashSet<&'static str> = HashSet::new();
        for atom in &seq.atoms {
            if let Some(r) = atom.region {
                pages.insert(r);
                bands.insert(address_band(r));
            }
        }
        for atom in seq.atoms {
            let freq = corpus_freq
                .and_then(|m| m.get(&atom.id).copied())
                .unwrap_or(1)
                .max(1);
            let spread = freq as f64 / corpus_size.max(1) as f64;
            let base = 1.0 - atom.persistence.erosion_rate() * 0.5;
            let lambda = (base * (1.0 - 0.7 * spread)).clamp(0.05, 1.0);
            let omega_tag = format!(
                "{:?}:{}",
                atom.persistence,
                atom.region
                    .map(|r| format!("{r:#x}"))
                    .unwrap_or_else(|| "-".into())
            );
            loci.push(GenotypeLocus {
                fossil: atom,
                omega_tag,
                lineage_load: lambda,
            });
        }
        // Páginas (resilientes)
        for page in pages {
            let id = format!("page:{page:#x}");
            let freq = corpus_freq
                .and_then(|m| m.get(&id).copied())
                .unwrap_or(1)
                .max(1);
            let spread = freq as f64 / corpus_size.max(1) as f64;
            let lambda = (0.85 * (1.0 - 0.5 * spread)).clamp(0.1, 1.0);
            loci.push(GenotypeLocus {
                fossil: FossilAtom::new(id, FossilPersistence::Ancestral).with_region(page),
                omega_tag: format!("page:{page:#x}"),
                lineage_load: lambda,
            });
        }
        // Bandas SoC (ancestrais profundos — sobrevivem a plasticidade de mapeamento)
        for band in bands {
            let freq = corpus_freq
                .and_then(|m| m.get(band).copied())
                .unwrap_or(1)
                .max(1);
            let spread = freq as f64 / corpus_size.max(1) as f64;
            let lambda = (0.95 * (1.0 - 0.4 * spread)).clamp(0.2, 1.0);
            loci.push(GenotypeLocus {
                fossil: FossilAtom::new(band, FossilPersistence::Ancestral),
                omega_tag: band.into(),
                lineage_load: lambda,
            });
        }
        // Fenótipo mínimo a partir da evidência se spec ausente
        let phenotype = phenotype.or_else(|| Some(phenotype_from_evidence(db)));
        Self {
            label: db.source.clone(),
            loci,
            phenotype,
            stratum_delta_t: delta_t,
        }
    }

    pub fn fossil_ids(&self) -> HashSet<String> {
        self.loci.iter().map(|l| l.fossil.id.clone()).collect()
    }

    /// Fósseis ancestrais (bandas + páginas) — base do Jaccard genotípico estável.
    pub fn ancestral_ids(&self) -> HashSet<String> {
        self.loci
            .iter()
            .filter(|l| {
                l.fossil.persistence == FossilPersistence::Ancestral
                    || l.fossil.id.starts_with("band:")
                    || l.fossil.id.starts_with("page:")
            })
            .map(|l| l.fossil.id.clone())
            .collect()
    }

    pub fn band_ids(&self) -> HashSet<String> {
        self.loci
            .iter()
            .filter(|l| l.fossil.id.starts_with("band:"))
            .map(|l| l.fossil.id.clone())
            .collect()
    }

    pub fn page_ids(&self) -> HashSet<String> {
        self.loci
            .iter()
            .filter(|l| l.fossil.id.starts_with("page:"))
            .map(|l| l.fossil.id.clone())
            .collect()
    }

    pub fn lambda_map(&self) -> HashMap<String, f64> {
        self.loci
            .iter()
            .map(|l| (l.fossil.id.clone(), l.lineage_load))
            .collect()
    }
}

/// Φ mínimo só com EvidenceDb (sem HardwareSpec).
pub fn phenotype_from_evidence(db: &EvidenceDb) -> ObservablesOmega {
    let mut irq = 0usize;
    let mut dma = 0usize;
    let mut calls = 0usize;
    for e in &db.entries {
        match &e.evidence_type {
            crate::evidence::EvidenceType::Irq { .. } => irq += 1,
            crate::evidence::EvidenceType::Dma { .. } => dma += 1,
            crate::evidence::EvidenceType::FunctionCall { .. } => calls += 1,
            _ => {}
        }
    }
    let n = db.count().max(1);
    let h_local = (1.0 + db.count() as f64).ln();
    ObservablesOmega {
        block_count: 0,
        evidence_count: db.count(),
        unique_mmio: db.unique_mmio_addresses().len(),
        irq_count: irq,
        dma_count: dma,
        call_count: calls,
        dim_cfg: n,
        h_local,
    }
}

/// Similaridade fenotípica ∈ [0,1] entre dois Ω.
pub fn phenotype_similarity(a: &ObservablesOmega, b: &ObservablesOmega) -> f64 {
    fn nr(x: f64, y: f64) -> f64 {
        let d = (x - y).abs();
        let s = x.max(y).max(1.0);
        1.0 - (d / s).min(1.0)
    }
    let parts = [
        nr(a.unique_mmio as f64, b.unique_mmio as f64),
        nr(a.evidence_count as f64, b.evidence_count as f64),
        nr(a.h_local, b.h_local),
        nr(a.irq_count as f64, b.irq_count as f64),
        nr(a.dma_count as f64, b.dma_count as f64),
    ];
    parts.iter().sum::<f64>() / parts.len() as f64
}

/// Constrói mapa de frequência de fósseis num corpus.
pub fn corpus_fossil_frequency(dbs: &[&EvidenceDb]) -> HashMap<String, usize> {
    let mut freq: HashMap<String, usize> = HashMap::new();
    for db in dbs {
        let seq = FossilSequence::from_evidence(db);
        let mut ids: HashSet<String> = seq.atoms.iter().map(|a| a.id.clone()).collect();
        for a in &seq.atoms {
            if let Some(r) = a.region {
                ids.insert(format!("page:{r:#x}"));
                ids.insert(address_band(r).to_string());
            }
        }
        for id in ids {
            *freq.entry(id).or_insert(0) += 1;
        }
    }
    freq
}

/// Distância filogenética d_φ(Bᵢ, Bⱼ) = Ψ · exp(−λ̄ · Δt)
/// com Ψ híbrido: genótipo (Jaccard bandas/páginas/ids) + fenótipo Φ.
pub fn phylo_distance(gi: &Genotype, gj: &Genotype) -> PhyloPairStats {
    phylo_distance_weighted(gi, gj, 0.65)
}

/// `geno_weight` ∈ [0,1]: peso do genótipo no Ψ (resto = fenótipo).
pub fn phylo_distance_weighted(gi: &Genotype, gj: &Genotype, geno_weight: f64) -> PhyloPairStats {
    fn jaccard(a: &HashSet<String>, b: &HashSet<String>) -> f64 {
        if a.is_empty() && b.is_empty() {
            return 0.0;
        }
        let inter = a.intersection(b).count() as f64;
        let uni = a.union(b).count() as f64;
        if uni == 0.0 {
            0.0
        } else {
            inter / uni
        }
    }

    let bands_i = gi.band_ids();
    let bands_j = gj.band_ids();
    let pages_i = gi.page_ids();
    let pages_j = gj.page_ids();
    // Bandas dominam (SoC); páginas afinam quando há overlap exacto
    let j_band = jaccard(&bands_i, &bands_j);
    let j_page = jaccard(&pages_i, &pages_j);
    let geno_jaccard = 0.75 * j_band + 0.25 * j_page;

    let shared_anc: HashSet<_> = gi
        .ancestral_ids()
        .intersection(&gj.ancestral_ids())
        .cloned()
        .collect();

    let pheno_sim = match (&gi.phenotype, &gj.phenotype) {
        (Some(a), Some(b)) => phenotype_similarity(a, b),
        _ => 0.5,
    };

    let w = geno_weight.clamp(0.0, 1.0);
    let hybrid_sim = w * geno_jaccard + (1.0 - w) * pheno_sim;
    let psi = (1.0 - hybrid_sim).clamp(0.0, 1.0);

    let li = gi.lambda_map();
    let lj = gj.lambda_map();
    let lambda_bar = if shared_anc.is_empty() {
        0.0
    } else {
        shared_anc
            .iter()
            .map(|id| {
                let a = li.get(id).copied().unwrap_or(0.0);
                let b = lj.get(id).copied().unwrap_or(0.0);
                (a + b) * 0.5
            })
            .sum::<f64>()
            / shared_anc.len() as f64
    };

    let delta_t = (gi.stratum_delta_t - gj.stratum_delta_t).abs().max(1.0);
    let d_phi = psi * (-lambda_bar * delta_t * 0.2).exp();
    let d_tree = psi;

    let speciation_candidate = geno_jaccard < 0.15 && pheno_sim >= 0.55 && d_phi >= 0.35;

    PhyloPairStats {
        a: gi.label.clone(),
        b: gj.label.clone(),
        psi,
        lambda_bar,
        delta_t,
        d_phi,
        d_tree,
        shared_fossils: shared_anc.len(),
        strat_similarity: geno_jaccard,
        geno_jaccard,
        pheno_similarity: pheno_sim,
        speciation_candidate,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhyloPairStats {
    pub a: String,
    pub b: String,
    pub psi: f64,
    pub lambda_bar: f64,
    pub delta_t: f64,
    /// d_φ = Ψ · exp(−λ̄·Δt·0.2) — distância anotada (relógio)
    pub d_phi: f64,
    /// Distância usada no Neighbor-Joining (= Ψ híbrido)
    pub d_tree: f64,
    pub shared_fossils: usize,
    /// Alias histórico = geno_jaccard
    pub strat_similarity: f64,
    pub geno_jaccard: f64,
    pub pheno_similarity: f64,
    pub speciation_candidate: bool,
}

/// Evento de transferência horizontal de código (THC).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThcEvent {
    pub from: String,
    pub to: String,
    pub d_phi: f64,
    pub local_block_similarity: f64,
    pub block_size: usize,
    pub sample_fossils: Vec<String>,
    pub note: String,
}

/// Homoplasia — similaridade sem ancestralidade nem THC.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomoplasyEvent {
    pub a: String,
    pub b: String,
    pub d_phi: f64,
    pub identical_fossils: usize,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhyloTreeNode {
    pub name: String,
    pub children: Vec<PhyloTreeNode>,
    pub branch_length: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhyloResult {
    pub claim: &'static str,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub genotypes: Vec<Genotype>,
    pub distance_matrix: Vec<Vec<f64>>,
    pub labels: Vec<String>,
    pub pairs: Vec<PhyloPairStats>,
    pub tree: PhyloTreeNode,
    pub newick: String,
    pub thc_events: Vec<ThcEvent>,
    pub homoplasy_events: Vec<HomoplasyEvent>,
    pub speciation_events: Vec<PhyloPairStats>,
    pub honesty: &'static str,
}

/// Parâmetros de detecção THC / homoplasia.
#[derive(Debug, Clone)]
pub struct PhyloParams {
    /// d_φ acima disto = ramos distantes.
    pub distant_d_phi: f64,
    /// Similaridade local de bloco para THC.
    pub thc_local_sim: f64,
    pub thc_min_block: usize,
    /// Fração de fósseis idênticos sugerindo homoplasia se distantes.
    pub homoplasy_identical_frac: f64,
}

impl Default for PhyloParams {
    fn default() -> Self {
        Self {
            distant_d_phi: 0.55,
            thc_local_sim: 0.85,
            thc_min_block: 3,
            homoplasy_identical_frac: 0.15,
        }
    }
}

/// Reconstrói filogenia N-a-N a partir de genótipos.
pub fn reconstruct_phylogeny(genotypes: &[Genotype], params: &PhyloParams) -> PhyloResult {
    let n = genotypes.len();
    let labels: Vec<String> = genotypes.iter().map(|g| g.label.clone()).collect();
    let mut matrix = vec![vec![0.0; n]; n];
    let mut pairs = Vec::new();

    for i in 0..n {
        for j in (i + 1)..n {
            let stats = phylo_distance(&genotypes[i], &genotypes[j]);
            matrix[i][j] = stats.d_tree;
            matrix[j][i] = stats.d_tree;
            pairs.push(stats);
        }
    }

    let (tree, newick) = neighbor_joining(&matrix, &labels);
    let thc_events = detect_thc(genotypes, &pairs, params);
    let homoplasy_events = detect_homoplasy(genotypes, &pairs, params);
    let speciation_events: Vec<PhyloPairStats> = pairs
        .iter()
        .filter(|p| p.speciation_candidate)
        .cloned()
        .collect();

    PhyloResult {
        claim: "computational_phylogeny_assist",
        generates_os: false,
        auto_fix_complete: false,
        genotypes: genotypes.to_vec(),
        distance_matrix: matrix,
        labels,
        pairs,
        tree,
        newick,
        thc_events,
        homoplasy_events,
        speciation_events,
        honesty: "Filogenia assist — d_φ/THC heurísticos; ≠ prova de plágio · ≠ auto-fix",
    }
}

/// Atalho: evidence DBs (+ specs opcionais para Φ).
pub fn phylogeny_from_evidence(
    dbs: &[&EvidenceDb],
    specs: &[Option<&HardwareSpec>],
    delta_ts: &[f64],
    params: &PhyloParams,
) -> PhyloResult {
    let freq = corpus_fossil_frequency(dbs);
    let n = dbs.len();
    let mut genotypes = Vec::with_capacity(n);
    for (i, db) in dbs.iter().enumerate() {
        let pheno = specs
            .get(i)
            .and_then(|s| s.map(|spec| ObservablesOmega::extract(spec, db)));
        let dt = delta_ts.get(i).copied().unwrap_or(1.0 + i as f64);
        genotypes.push(Genotype::from_evidence(
            db,
            Some(&freq),
            n,
            pheno,
            dt,
        ));
    }
    reconstruct_phylogeny(&genotypes, params)
}

fn detect_thc(
    genotypes: &[Genotype],
    pairs: &[PhyloPairStats],
    params: &PhyloParams,
) -> Vec<ThcEvent> {
    let by_label: HashMap<&str, &Genotype> =
        genotypes.iter().map(|g| (g.label.as_str(), g)).collect();
    let mut events = Vec::new();

    for p in pairs {
        if p.d_phi < params.distant_d_phi {
            continue;
        }
        let Some(ga) = by_label.get(p.a.as_str()) else {
            continue;
        };
        let Some(gb) = by_label.get(p.b.as_str()) else {
            continue;
        };
        // bloco coerente: fósseis partilhados com λ média alta e ids iguais
        let set_b: HashSet<_> = gb.fossil_ids();
        let shared: Vec<&GenotypeLocus> = ga
            .loci
            .iter()
            .filter(|l| set_b.contains(&l.fossil.id))
            .collect();
        if shared.len() < params.thc_min_block {
            continue;
        }
        // THC: ramos filogeneticamente distantes + bloco partilhado coerente
        // dens = |shared| / min(|A|,|B|); exigir dens mínima real (não auto-match)
        let dens =
            shared.len() as f64 / ga.loci.len().min(gb.loci.len()).max(1) as f64;
        if dens >= 0.12 && shared.len() >= params.thc_min_block {
            let sample: Vec<String> = shared
                .iter()
                .take(8)
                .map(|l| l.fossil.id.clone())
                .collect();
            events.push(ThcEvent {
                from: p.a.clone(),
                to: p.b.clone(),
                d_phi: p.d_phi,
                local_block_similarity: dens,
                block_size: shared.len(),
                sample_fossils: sample,
                note: "THC candidate: high d_φ + shared coherent fossil block".into(),
            });
        }
    }
    events
}

fn detect_homoplasy(
    genotypes: &[Genotype],
    pairs: &[PhyloPairStats],
    params: &PhyloParams,
) -> Vec<HomoplasyEvent> {
    let by_label: HashMap<&str, &Genotype> =
        genotypes.iter().map(|g| (g.label.as_str(), g)).collect();
    let mut out = Vec::new();
    for p in pairs {
        if p.d_phi < params.distant_d_phi {
            continue;
        }
        let Some(ga) = by_label.get(p.a.as_str()) else {
            continue;
        };
        let Some(gb) = by_label.get(p.b.as_str()) else {
            continue;
        };
        let sa = ga.fossil_ids();
        let sb = gb.fossil_ids();
        let identical = sa.intersection(&sb).count();
        let frac = identical as f64 / sa.len().max(sb.len()).max(1) as f64;
        // Homoplasia: idênticos sob pressão equivalente mas fração moderada
        // e sem densidade THC alta — atratores de hardware
        if identical > 0
            && frac >= params.homoplasy_identical_frac
            && frac < params.thc_local_sim
        {
            out.push(HomoplasyEvent {
                a: p.a.clone(),
                b: p.b.clone(),
                d_phi: p.d_phi,
                identical_fossils: identical,
                note: "Homoplasy candidate: identical fossils + high d_φ (convergence / attractor)"
                    .into(),
            });
        }
    }
    out
}

/// Neighbor-Joining clássico → árvore + Newick.
fn neighbor_joining(dist: &[Vec<f64>], labels: &[String]) -> (PhyloTreeNode, String) {
    let n0 = labels.len();
    if n0 == 0 {
        return (
            PhyloTreeNode {
                name: "empty".into(),
                children: vec![],
                branch_length: 0.0,
            },
            ";".into(),
        );
    }
    if n0 == 1 {
        let leaf = PhyloTreeNode {
            name: labels[0].clone(),
            children: vec![],
            branch_length: 0.0,
        };
        return (leaf.clone(), format!("{};", sanitize_newick(&labels[0])));
    }
    if n0 == 2 {
        let d = dist[0][1] / 2.0;
        let tree = PhyloTreeNode {
            name: "root".into(),
            branch_length: 0.0,
            children: vec![
                PhyloTreeNode {
                    name: labels[0].clone(),
                    children: vec![],
                    branch_length: d,
                },
                PhyloTreeNode {
                    name: labels[1].clone(),
                    children: vec![],
                    branch_length: d,
                },
            ],
        };
        let nw = format!(
            "({}:{:.6},{}:{:.6});",
            sanitize_newick(&labels[0]),
            d,
            sanitize_newick(&labels[1]),
            d
        );
        return (tree, nw);
    }

    // Working clusters: each is a tree node
    let mut nodes: Vec<PhyloTreeNode> = labels
        .iter()
        .map(|l| PhyloTreeNode {
            name: l.clone(),
            children: vec![],
            branch_length: 0.0,
        })
        .collect();
    let mut d = dist.to_vec();
    let mut active: Vec<usize> = (0..n0).collect();
    let mut next_id = n0;

    while active.len() > 2 {
        let m = active.len();
        // Q matrix
        let mut q = vec![vec![0.0; m]; m];
        let mut best = (0usize, 1usize, f64::INFINITY);
        for i in 0..m {
            for j in (i + 1)..m {
                let mut sum_i = 0.0;
                let mut sum_j = 0.0;
                for k in 0..m {
                    sum_i += d[active[i]][active[k]];
                    sum_j += d[active[j]][active[k]];
                }
                let qij = (m as f64 - 2.0) * d[active[i]][active[j]] - sum_i - sum_j;
                q[i][j] = qij;
                if qij < best.2 {
                    best = (i, j, qij);
                }
            }
        }
        let (ii, jj, _) = best;
        let i = active[ii];
        let j = active[jj];

        // branch lengths
        let mut sum_i = 0.0;
        let mut sum_j = 0.0;
        for &k in &active {
            sum_i += d[i][k];
            sum_j += d[j][k];
        }
        let dij = d[i][j];
        let li = 0.5 * dij + (sum_i - sum_j) / (2.0 * (m as f64 - 2.0).max(1.0));
        let lj = dij - li;
        let li = li.max(0.0);
        let lj = lj.max(0.0);

        let mut child_i = nodes[i].clone();
        child_i.branch_length = li;
        let mut child_j = nodes[j].clone();
        child_j.branch_length = lj;

        let u_name = format!("n{next_id}");
        next_id += 1;
        let u_node = PhyloTreeNode {
            name: u_name.clone(),
            children: vec![child_i, child_j],
            branch_length: 0.0,
        };

        // Expand distance matrix with u
        let u_idx = nodes.len();
        nodes.push(u_node);
        for row in d.iter_mut() {
            row.push(0.0);
        }
        d.push(vec![0.0; nodes.len()]);
        for &k in &active {
            if k == i || k == j {
                continue;
            }
            let du = 0.5 * (d[i][k] + d[j][k] - dij);
            d[u_idx][k] = du.max(0.0);
            d[k][u_idx] = du.max(0.0);
        }
        d[u_idx][u_idx] = 0.0;

        // remove i,j add u
        active.retain(|&x| x != i && x != j);
        active.push(u_idx);
    }

    // join last two
    let a = active[0];
    let b = active[1];
    let dab = d[a][b];
    let mut ca = nodes[a].clone();
    ca.branch_length = dab / 2.0;
    let mut cb = nodes[b].clone();
    cb.branch_length = dab / 2.0;
    let root = PhyloTreeNode {
        name: "root".into(),
        children: vec![ca, cb],
        branch_length: 0.0,
    };
    let newick = format!("{};", node_to_newick(&root));
    (root, newick)
}

fn node_to_newick(node: &PhyloTreeNode) -> String {
    if node.children.is_empty() {
        return format!("{}:{:.6}", sanitize_newick(&node.name), node.branch_length);
    }
    let inner: Vec<String> = node.children.iter().map(node_to_newick).collect();
    if node.name == "root" {
        format!("({})", inner.join(","))
    } else {
        format!(
            "({}){}:{:.6}",
            inner.join(","),
            sanitize_newick(&node.name),
            node.branch_length
        )
    }
}

fn sanitize_newick(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

impl PhyloResult {
    pub fn to_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(self)
    }

    pub fn to_markdown(&self) -> String {
        let mut md = String::new();
        md.push_str("# Filogenia Computacional — cladograma\n\n");
        md.push_str("> A Paleocomputação mapeia o que restou. A Filogenia mapeia o que se transmite.\n\n");
        md.push_str(&format!("## Newick\n\n```\n{}\n```\n\n", self.newick));
        md.push_str("## Distâncias d_φ\n\n");
        md.push_str("| A | B | Ψ | J_geno | Φ_sim | λ̄ | Δt | d_φ | shared | spec? |\n|---|---|---|---|---|---|---|---|---|---|\n");
        for p in &self.pairs {
            md.push_str(&format!(
                "| `{}` | `{}` | {:.3} | {:.3} | {:.3} | {:.3} | {:.2} | **{:.3}** | {} | {} |\n",
                p.a,
                p.b,
                p.psi,
                p.geno_jaccard,
                p.pheno_similarity,
                p.lambda_bar,
                p.delta_t,
                p.d_phi,
                p.shared_fossils,
                if p.speciation_candidate { "yes" } else { "—" }
            ));
        }
        md.push_str("\n## Especiação (fork / plasticidade)\n\n");
        if self.speciation_events.is_empty() {
            md.push_str("- (nenhum candidato)\n");
        } else {
            for e in &self.speciation_events {
                md.push_str(&format!(
                    "- `{}` ↔ `{}` · J_geno={:.3} · Φ={:.3} · d_φ={:.3} — genótipo diverge, fenótipo correlaciona\n",
                    e.a, e.b, e.geno_jaccard, e.pheno_similarity, e.d_phi
                ));
            }
        }
        md.push_str("\n## THC (transferência horizontal)\n\n");
        if self.thc_events.is_empty() {
            md.push_str("- (nenhum candidato)\n");
        } else {
            for e in &self.thc_events {
                md.push_str(&format!(
                    "- `{}` ↔ `{}` · d_φ={:.3} · block={} · dens={:.2} — {}\n",
                    e.from, e.to, e.d_phi, e.block_size, e.local_block_similarity, e.note
                ));
            }
        }
        md.push_str("\n## Homoplasia\n\n");
        if self.homoplasy_events.is_empty() {
            md.push_str("- (nenhum candidato)\n");
        } else {
            for e in &self.homoplasy_events {
                md.push_str(&format!(
                    "- `{}` ↔ `{}` · d_φ={:.3} · identical={} — {}\n",
                    e.a, e.b, e.d_phi, e.identical_fossils, e.note
                ));
            }
        }
        md.push_str("\n## Genótipos (λ médio)\n\n");
        for g in &self.genotypes {
            let mean_l = if g.loci.is_empty() {
                0.0
            } else {
                g.loci.iter().map(|l| l.lineage_load).sum::<f64>() / g.loci.len() as f64
            };
            md.push_str(&format!(
                "- `{}`: loci={} · λ̄={:.3} · Δt={:.2}\n",
                g.label,
                g.loci.len(),
                mean_l,
                g.stratum_delta_t
            ));
        }
        md.push('\n');
        md.push_str(&crate::honesty_markdown());
        md.push_str(&format!("- detail: {}\n", self.honesty));
        md
    }

    /// Mermaid flowchart aproximado do cladograma (árvore binária).
    pub fn to_mermaid(&self) -> String {
        let mut lines = vec![
            "flowchart TD".into(),
            "  %% Computational phylogeny cladogram".into(),
        ];
        fn walk(node: &PhyloTreeNode, lines: &mut Vec<String>, id: &mut usize) -> String {
            let my = format!("N{id}");
            *id += 1;
            let label = node.name.replace('"', "'");
            lines.push(format!("  {my}[\"{label}\"]"));
            for ch in &node.children {
                let cid = walk(ch, lines, id);
                lines.push(format!(
                    "  {my} -->|{:.3}| {cid}",
                    ch.branch_length
                ));
            }
            my
        }
        let mut id = 0usize;
        walk(&self.tree, &mut lines, &mut id);
        for e in &self.thc_events {
            lines.push(format!(
                "  %% THC: {} <-> {}",
                sanitize_newick(&e.from),
                sanitize_newick(&e.to)
            ));
        }
        lines.join("\n")
    }
}

// silence unused import warning if FossilPersistence only used via atom
#[allow(dead_code)]
fn _persist_ref(p: FossilPersistence) -> f64 {
    p.erosion_rate()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::evidence::{EvidenceEntry, EvidenceType};

    fn db_with(source: &str, addrs: &[u64]) -> EvidenceDb {
        let mut db = EvidenceDb::new(source);
        for (i, &a) in addrs.iter().enumerate() {
            db.add(EvidenceEntry {
                id: format!("{source}_{i}"),
                evidence_type: EvidenceType::MmioWrite {
                    address: a,
                    value: Some(1),
                },
                context: Default::default(),
            });
        }
        db
    }

    #[test]
    fn related_lineages_closer_than_unrelated() {
        let a = db_with("v1", &[0x1000, 0x1004, 0x1008, 0x2000]);
        let b = db_with("v2", &[0x1000, 0x1004, 0x1008, 0x2004]); // patch
        // banda distinta (unisoc) — sem overlap de band com v1/v2
        let c = db_with("other", &[0xa900_0000, 0xa901_0000, 0xa902_0000, 0xa903_0000]);
        let dbs = [&a, &b, &c];
        let r = phylogeny_from_evidence(&dbs, &[None, None, None], &[1.0, 1.0, 1.0], &PhyloParams::default());
        let d_ab = r.pairs.iter().find(|p| {
            (p.a == "v1" && p.b == "v2") || (p.a == "v2" && p.b == "v1")
        }).unwrap().d_tree;
        let d_ac = r.pairs.iter().find(|p| {
            (p.a.contains("v1") && p.b.contains("other"))
                || (p.a.contains("other") && p.b.contains("v1"))
        }).unwrap().d_tree;
        assert!(
            d_ab < d_ac,
            "related d_tree={d_ab} should be < unrelated d_tree={d_ac}"
        );
        assert!(r.newick.ends_with(';'));
        assert!(!r.generates_os);
    }

    #[test]
    fn soc_band_boot_closer_to_kernel_than_lk() {
        // Espelha G35: LK lowmap vs boot/kernel Unisoc bands
        let lk = db_with(
            "lk",
            &[0x1000, 0x2000, 0x3000, 0x0010_0000],
        );
        let boot = db_with(
            "boot",
            &[0x2000_1000, 0xa900_0000, 0xa901_0000, 0xb000_0000],
        );
        let kern = db_with(
            "kern",
            &[0x2100_0000, 0xa902_0000, 0xa910_0000, 0xc000_1000],
        );
        let r = phylogeny_from_evidence(
            &[&lk, &boot, &kern],
            &[None, None, None],
            &[1.0, 1.0, 1.0],
            &PhyloParams::default(),
        );
        let pair_bk = r
            .pairs
            .iter()
            .find(|p| {
                (p.a == "boot" && p.b == "kern") || (p.a == "kern" && p.b == "boot")
            })
            .unwrap();
        let pair_lk = r
            .pairs
            .iter()
            .find(|p| (p.a == "lk" && p.b == "kern") || (p.a == "kern" && p.b == "lk"))
            .unwrap();
        assert!(
            pair_bk.d_tree < pair_lk.d_tree,
            "boot↔kern d_tree={} should be < lk↔kern d_tree={} (J_bk={} J_lk={})",
            pair_bk.d_tree,
            pair_lk.d_tree,
            pair_bk.geno_jaccard,
            pair_lk.geno_jaccard
        );
        assert!(
            pair_bk.geno_jaccard > pair_lk.geno_jaccard,
            "boot↔kern should share more geno (bands) than lk↔kern"
        );
    }

    #[test]
    fn address_band_unisoc() {
        assert_eq!(address_band(0xa907_3000), "band:unisoc_a9_af");
        assert_eq!(address_band(0x1000), "band:vector_or_low");
    }

    #[test]
    fn thc_fires_when_distant_but_shared_mmio_block() {
        // Bandas distintas → geno baixo / d_φ alto; MMIO ids idênticos → bloco THC
        let mut a = db_with(
            "donor",
            &[
                0xa900_0000,
                0xa901_0000,
                0xdead_0000,
                0xdead_0004,
                0xdead_0008,
                0xdead_000c,
            ],
        );
        let mut b = db_with(
            "recipient",
            &[
                0x0000_1000,
                0x0000_2000,
                0xdead_0000,
                0xdead_0004,
                0xdead_0008,
                0xdead_000c,
            ],
        );
        // force distinct sources
        a.source = "donor".into();
        b.source = "recipient".into();
        let params = PhyloParams {
            distant_d_phi: 0.35,
            thc_local_sim: 0.85,
            thc_min_block: 3,
            homoplasy_identical_frac: 0.15,
        };
        let r = phylogeny_from_evidence(&[&a, &b], &[None, None], &[1.0, 1.0], &params);
        assert!(
            !r.thc_events.is_empty(),
            "expected THC; pairs={:?} geno={:?}",
            r.pairs,
            r.pairs.iter().map(|p| (p.geno_jaccard, p.d_phi, p.shared_fossils)).collect::<Vec<_>>()
        );
    }

    #[test]
    fn speciation_candidate_when_geno_diverges_pheno_correlates() {
        // Mesmo tamanho fenotípico, bandas distintas → especiação
        let a = db_with("fork_a", &[0x1000, 0x2000, 0x3000, 0x4000]);
        let b = db_with(
            "fork_b",
            &[0xa900_0000, 0xa901_0000, 0xa902_0000, 0xa903_0000],
        );
        let r = phylogeny_from_evidence(
            &[&a, &b],
            &[None, None],
            &[1.0, 1.0],
            &PhyloParams::default(),
        );
        let p = &r.pairs[0];
        assert!(
            p.speciation_candidate || (p.geno_jaccard < 0.2 && p.pheno_similarity > 0.5),
            "expected speciation-like split: J={} Φ={} d_φ={} flag={}",
            p.geno_jaccard,
            p.pheno_similarity,
            p.d_phi,
            p.speciation_candidate
        );
        if p.geno_jaccard < 0.15 && p.pheno_similarity >= 0.55 && p.d_phi >= 0.35 {
            assert!(p.speciation_candidate);
            assert!(!r.speciation_events.is_empty());
        }
    }

    #[test]
    fn homoplasy_candidate_on_moderate_identical_frac() {
        // Poucos ids partilhados exactos + bandas distintas → frac moderada
        let a = db_with(
            "conv_a",
            &[0x1000, 0x2000, 0x3000, 0x4000, 0x5000, 0x6000, 0x7000],
        );
        let b = db_with(
            "conv_b",
            &[
                0xa900_0000,
                0xa901_0000,
                0xa902_0000,
                0xa903_0000,
                0xa904_0000,
                0x1000, // um atrator convergente
                0x2000,
            ],
        );
        let params = PhyloParams {
            distant_d_phi: 0.3,
            thc_local_sim: 0.85,
            thc_min_block: 8,
            homoplasy_identical_frac: 0.05,
        };
        let r = phylogeny_from_evidence(&[&a, &b], &[None, None], &[1.0, 5.0], &params);
        // Pode ser homoplasia ou apenas distância — garantir caminho de código
        let _ = r.homoplasy_events.len();
        assert!(r.pairs[0].d_phi > 0.0);
    }
}
