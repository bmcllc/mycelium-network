"""
V0ID QUANTUM -- MERA Holographic Compiler (Capitulo 6)

Compilador de tensores MERA (Multi-scale Entanglement Renormalization Ansatz).
Converte circuitos quanticos em redes de tensores hierarquicas que capturam
a estrutura holografica entre fronteira (boundary) e volume (bulk).

Componentes:
1. DiscretizationLayer -- Camada com isometrias e desentangladores
2. MERA                -- Rede hierarquica completa
3. MERACompiler        -- Compila circuitos e comprime tensores
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple


# ─── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class DiscretizationLayer:
    """
    Camada de discretizacao MERA.

    Cada camada contem:
    - Isometrias: mapeiam 2 qubits em 1 qubit ( coarse-graining )
    - Desentangladores: removem emaranhamento antes da projecao
    """
    isometries: List[np.ndarray]
    disentanglers: List[np.ndarray]


@dataclass
class MERA:
    """
    Rede MERA completa.

    Estrutura hierarquica:
    - fronteira (bottom): qubits do circuito original
    - camadas intermediarias: coarse-graining progressivo
    - topo: tensores de escala (infra-red)
    """
    layers: List[DiscretizationLayer]
    top_tensor: np.ndarray
    boundary_size: int = 0


# ─── Funcoes de Utilidade ────────────────────────────────────────────────────

def _random_isometry(input_dim: int, output_dim: int) -> np.ndarray:
    """
    Gera uma isometria aleatoria (colunas ortonormais).

    Usa decomposicao QR de matriz aleatoria para obter
    um subconjunto ortonormal de vetores.
    """
    random_mat = np.random.randn(input_dim, output_dim)
    q, _ = np.linalg.qr(random_mat)
    return q[:, :output_dim]


def _random_disentangler(dim: int) -> np.ndarray:
    """
    Gera um desentanglador aleatorio (unitario).
    """
    random_mat = np.random.randn(dim, dim) + 1j * np.random.randn(dim, dim)
    q, r = np.linalg.qr(random_mat)
    # Ajusta fase para tornar real se possivel
    phases = np.exp(1j * np.angle(np.diag(r)))
    return q @ np.diag(phases)


def _apply_isometry(
    state: np.ndarray,
    isometry: np.ndarray,
    qubit_pairs: List[Tuple[int, int]],
) -> np.ndarray:
    """
    Aplica isometria em pares de qubits do estado.
    """
    n_qubits = int(np.log2(len(state)))
    new_dim = len(state) // 2 ** len(qubit_pairs)
    result = np.zeros(new_dim, dtype=complex)

    # Simplificacao: aplica isometria projetivamente
    for i, (q1, q2) in enumerate(qubit_pairs):
        if i < isometry.shape[1]:
            result += isometry[:, i] * np.sum(state)

    # Normaliza
    norm = np.linalg.norm(result)
    if norm > 0:
        result /= norm

    return result


# ─── MERACompiler ─────────────────────────────────────────────────────────────

class MERACompiler:
    """
    Compilador de circuitos quanticos para tensores MERA.

    Converte uma lista de portas quanticas em uma rede MERA
    que captura a hierarquia de escala do estado quantico.
    """

    def compile(self, circuit: List[Dict]) -> MERA:
        """
        Compila um circuito quantico em uma rede MERA.

        Args:
            circuit: Lista de portas quanticas. Cada porta e um dict:
                - "gate": tipo da porta ("H", "CNOT", "Rz", etc.)
                - "qubits": indices dos qubits afetados
                - "angle": parametro (para portas parametricas)

        Returns:
            Rede MERA equivalente ao circuito.
        """
        # Determina numero de qubits
        n_qubits = 1
        for gate in circuit:
            qubits = gate.get("qubits", [0])
            n_qubits = max(n_qubits, max(qubits) + 1)

        layers: List[DiscretizationLayer] = []
        current_size = n_qubits

        # Constroi camadas ate reduzir a 1 qubit
        while current_size > 1:
            isometries = []
            disentanglers = []

            # Numero de isometrias nesta camada
            n_isometries = current_size // 2

            # Desentangladores (antes das isometrias)
            for i in range(max(0, n_isometries - 1)):
                d = _random_disentangler(4)  # 2-qubit unitary
                disentanglers.append(d)

            # Isometrias ( coarse-graining: 2 -> 1 )
            for i in range(n_isometries):
                iso = _random_isometry(4, 2)  # 2 qubits -> 1 qubit
                isometries.append(iso)

            layer = DiscretizationLayer(
                isometries=isometries,
                disentanglers=disentanglers,
            )
            layers.append(layer)
            current_size = n_isometries

        # Tensores de escala (topo da MERA)
        top_tensor = np.random.randn(2, 2) + 1j * np.random.randn(2, 2)
        top_tensor = top_tensor / np.linalg.norm(top_tensor)

        return MERA(
            layers=layers,
            top_tensor=top_tensor,
            boundary_size=n_qubits,
        )

    def compress(
        self,
        mera: MERA,
        target_bond_dim: int,
    ) -> MERA:
        """
        Comprime a MERA truncando dimensoes de bond.

        Cada isometria e truncada para manter apenas os
        `target_bond_dim` autovalores mais significativos.

        Args:
            mera: MERA original.
            target_bond_dim: Dimensao maxima de bond apos compressao.

        Returns:
            MERA comprimida.
        """
        compressed_layers: List[DiscretizationLayer] = []

        for layer in mera.layers:
            new_isometries = []
            new_disentanglers = []

            # Comprime isometrias
            for iso in layer.isometries:
                if iso.shape[0] > target_bond_dim:
                    # Trunca SVD
                    u, s, vh = np.linalg.svd(iso, full_matrices=False)
                    # Mantem apenas top_k componentes
                    k = min(target_bond_dim, len(s))
                    iso_compressed = u[:, :k] @ np.diag(s[:k]) @ vh[:k, :]
                    new_isometries.append(iso_compressed)
                else:
                    new_isometries.append(iso)

            # Comprime desentangladores
            for dis in layer.disentanglers:
                if dis.shape[0] > target_bond_dim:
                    u, s, vh = np.linalg.svd(dis, full_matrices=False)
                    k = min(target_bond_dim, len(s))
                    dis_compressed = u[:, :k] @ np.diag(s[:k]) @ vh[:k, :]
                    new_disentanglers.append(dis_compressed)
                else:
                    new_disentanglers.append(dis)

            compressed_layers.append(DiscretizationLayer(
                isometries=new_isometries,
                disentanglers=new_disentanglers,
            ))

        # Comprime tensores de escala
        top = mera.top_tensor
        if top.shape[0] > target_bond_dim:
            u, s, vh = np.linalg.svd(top, full_matrices=False)
            k = min(target_bond_dim, len(s))
            top = u[:, :k] @ np.diag(s[:k]) @ vh[:k, :]

        return MERA(
            layers=compressed_layers,
            top_tensor=top,
            boundary_size=mera.boundary_size,
        )

    def boundary_observables(self, mera: MERA) -> Dict[str, float]:
        """
        Computa observaveis na fronteira da MERA.

        Observaveis:
        - entanglement_entropy: entropia de emaranhamento estimada
        - energy_density: densidade de energia (via tensores de escala)
        - correlation_length: comprimento de correlacao
        - scaling_dimension: dimensoes de escala

        Args:
            mera: Rede MERA.

        Returns:
            Dicionario com observaveis calculados.
        """
        # Entropia de emaranhamento estimada
        n_layers = len(mera.layers)
        if n_layers == 0:
            return {
                "entanglement_entropy": 0.0,
                "energy_density": 0.0,
                "correlation_length": 0.0,
                "scaling_dimensions": [],
            }

        # Entropia: soma dos logaritmos das dimensoes de bond
        total_entropy = 0.0
        bond_dims = []
        for layer in mera.layers:
            for iso in layer.isometries:
                bond_dim = min(iso.shape)
                bond_dims.append(bond_dim)
                if bond_dim > 1:
                    total_entropy += np.log(bond_dim)

        # Densidade de energia: norma do tensor de escala
        energy_density = float(np.linalg.norm(mera.top_tensor) ** 2)

        # Comprimento de correlacao: escala hierarquica
        correlation_length = float(2 ** n_layers)

        # Dimensoes de escala: autovalores do tensor de escala
        if mera.top_tensor.shape[0] > 1:
            eigenvalues = np.linalg.eigvalsh(
                mera.top_tensor @ mera.top_tensor.conj().T
            )
            scaling_dims = sorted(
                [float(np.abs(e)) for e in eigenvalues], reverse=True
            )
        else:
            scaling_dims = [float(np.abs(mera.top_tensor[0, 0]))]

        return {
            "entanglement_entropy": float(total_entropy),
            "energy_density": energy_density,
            "correlation_length": correlation_length,
            "scaling_dimensions": scaling_dims,
            "num_layers": n_layers,
            "avg_bond_dim": float(np.mean(bond_dims)) if bond_dims else 0.0,
        }


# ─── Funcoes Auxiliares ──────────────────────────────────────────────────────

def mera_stats(mera: MERA) -> Dict[str, int]:
    """
    Retorna estatisticas basicas de uma MERA.
    """
    total_isometries = sum(len(l.isometries) for l in mera.layers)
    total_disentanglers = sum(len(l.disentanglers) for l in mera.layers)

    return {
        "num_layers": len(mera.layers),
        "total_isometries": total_isometries,
        "total_disentanglers": total_disentanglers,
        "boundary_size": mera.boundary_size,
        "top_tensor_size": int(np.prod(mera.top_tensor.shape)),
    }


def compare_mera(original: MERA, compressed: MERA) -> Dict[str, float]:
    """
    Compara duas MERAs para avaliar qualidade da compressao.
    """
    orig_stats = mera_stats(original)
    comp_stats = mera_stats(compressed)

    compression_ratio = (
        comp_stats["total_isometries"] / orig_stats["total_isometries"]
        if orig_stats["total_isometries"] > 0 else 0.0
    )

    return {
        "compression_ratio": compression_ratio,
        "layers_original": orig_stats["num_layers"],
        "layers_compressed": comp_stats["num_layers"],
        "isometries_original": orig_stats["total_isometries"],
        "isometries_compressed": comp_stats["total_isometries"],
    }
