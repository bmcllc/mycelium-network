pub mod spec;
pub mod inference;
pub mod evidence;
pub mod component_db;
pub mod mapping;
pub mod graphviz;
pub mod solver;
pub mod kg;
pub mod twin;
pub mod loop_;
pub mod design;
pub mod temporal;
pub mod event_graph;
pub mod replay;
pub mod smt;
pub mod tension;
pub mod strat_align;
pub mod paleo;
pub mod phylo;
pub mod honesty;

pub use spec::*;
pub use inference::*;
pub use strat_align::{
    FossilAtom, FossilPersistence, FossilSequence, StratAlignResult, StratAligner, StratAlignParams,
};
pub use paleo::{excavate, ObservablesOmega, PaleoExcavateResult};
pub use phylo::{
    address_band, corpus_fossil_frequency, phenotype_from_evidence, phenotype_similarity,
    phylo_distance, phylo_distance_weighted, phylogeny_from_evidence, reconstruct_phylogeny,
    Genotype, PhyloParams, PhyloResult,
};
pub use honesty::{
    markdown_section as honesty_markdown, AUTO_FIX_COMPLETE, BANNER as HONESTY_BANNER,
    GENERATES_OS, NOTE as HONESTY_NOTE, READINESS_FULL_CAVEAT,
};
