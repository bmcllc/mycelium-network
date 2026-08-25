"""
V0ID QUANTUM -- Redes de Spin (Capitulo 5.2)

Implementacao de redes de spin para gravidade quantica de lazos.
Cada no representa uma particula com spin j, cada aresta representa
uma interacao (intertwiner), e a evolucao temporal gera espumas de spin.

Componentes:
1. SpinNetwork -- Grafo com nos de spin e arestas projetadas
2. SpinFoam    -- Evolucao temporal (Pachner moves)
3. Amplitude   -- Produto de amplitudes de vertice
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional


# ─── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class SpinNode:
    """No de spin: identificador, numero qu=j, e valencia."""
    id: str
    spin: float  # numero quamtico j (meio-integer: 0, 0.5, 1, 1.5, ...)
    valence: int  # numero de arestas conectadas


@dataclass
class SpinEdge:
    """Aresta de spin: conecta dois nos com projecao m."""
    from_node: str
    to_node: str
    spin: float  # spin da aresta
    projection: float = 0.0  # projecao m (valor de -j a +j)


@dataclass
class SpinNetwork:
    """Rede de spin completa com intertwiners."""
    nodes: List[SpinNode]
    edges: List[SpinEdge]
    intertwiners: Dict[str, List[float]] = field(default_factory=dict)


@dataclass
class SpinFoam:
    """Espuma de spin: evolucao temporal de uma rede de spin."""
    vertices: List[Dict]
    edges: List[SpinEdge]
    faces: List[Dict]


# ─── 1. Criacao de Rede de Spin ──────────────────────────────────────────────

def _triangle_inequality(j1: float, j2: float, j3: float) -> bool:
    """
    Verifica a desigualdade triangular para tres spins.

    Condicao: |j1 - j2| <= j3 <= j1 + j2
    E: j1 + j2 + j3 e inteiro (ou meio-inteiro consistente).
    """
    return (
        abs(j1 - j2) <= j3 <= j1 + j2
        and (j1 + j2 + j3) % 1 == 0
    )


def create_spin_network(j_values: List[float]) -> SpinNetwork:
    """
    Cria uma rede de spin a partir de uma lista de valores de spin.

    Atribui spins aos nos e garante a desigualdade triangular
    nos vertices (onde tres ou mais arestas se encontram).

    Args:
        j_values: Lista de numeros quanticos j para os nos.

    Returns:
        Rede de spin construida.
    """
    nodes: List[SpinNode] = []
    edges: List[SpinEdge] = []
    intertwiners: Dict[str, List[float]] = {}

    # Cria nos
    for i, j in enumerate(j_values):
        node = SpinNode(
            id=f"n{i}",
            spin=j,
            valence=0,
        )
        nodes.append(node)

    # Conecta nos adjacentes (cadeia linear)
    for i in range(len(nodes) - 1):
        # Spin da aresta: media dos spins dos nos conectados
        edge_spin = (nodes[i].spin + nodes[i + 1].spin) / 2
        edge_spin = max(0.5, round(edge_spin * 2) / 2)  # meio-integer

        edge = SpinEdge(
            from_node=nodes[i].id,
            to_node=nodes[i + 1].id,
            spin=edge_spin,
        )
        edges.append(edge)
        nodes[i].valence += 1
        nodes[i + 1].valence += 1

    # Adiciona aresta de fechamento (anel) se possivel
    if len(nodes) >= 3:
        edge_spin = (nodes[0].spin + nodes[-1].spin) / 2
        edge_spin = max(0.5, round(edge_spin * 2) / 2)
        edge = SpinEdge(
            from_node=nodes[-1].id,
            to_node=nodes[0].id,
            spin=edge_spin,
        )
        edges.append(edge)
        nodes[-1].valence += 1
        nodes[0].valence += 1

    # Calcula intertwiners nos vertices
    for node in nodes:
        if node.valence >= 3:
            # Intertwiner: combinacao de spins que satisfaz conservacao
            neighbor_spins = []
            for e in edges:
                if e.from_node == node.id or e.to_node == node.id:
                    neighbor_spins.append(e.spin)

            if len(neighbor_spins) >= 3:
                # Verifica desigualdade triangular
                valid = True
                for i in range(len(neighbor_spins)):
                    for j in range(i + 1, len(neighbor_spins)):
                        for k in range(j + 1, len(neighbor_spins)):
                            if not _triangle_inequality(
                                neighbor_spins[i],
                                neighbor_spins[j],
                                neighbor_spins[k],
                            ):
                                valid = False
                                break

                if valid:
                    intertwiners[node.id] = neighbor_spins

    return SpinNetwork(
        nodes=nodes,
        edges=edges,
        intertwiners=intertwiners,
    )


# ─── 2. Evolucao para Espuma de Spin ────────────────────────────────────────

def pachner_move_23(
    foam: SpinFoam,
    edge1: SpinEdge,
    edge2: SpinEdge,
) -> SpinFoam:
    """
    Movimento de Pachner 2->3.

    Substitui duas arestas compartilhando um vertice
    por tres novas arestas formando um triangulo.

    Args:
        foam: Espuma de spin atual.
        edge1: Primeira aresta.
        edge2: Segunda aresta compartilhando vertice.

    Returns:
        Espuma apos o movimento 2->3.
    """
    # Novas arestas formadas pelo movimento 2->3
    new_edges = [
        SpinEdge(
            from_node=edge1.from_node,
            to_node=edge2.to_node,
            spin=(edge1.spin + edge2.spin) / 2,
        ),
        SpinEdge(
            from_node=edge2.from_node,
            to_node=edge1.to_node,
            spin=(edge1.spin + edge2.spin) / 2,
        ),
        SpinEdge(
            from_node=edge1.from_node,
            to_node=edge2.from_node,
            spin=(edge1.spin + edge2.spin) / 2,
        ),
    ]

    # Novo vertice formado
    new_vertex = {
        "type": "23_move",
        "spins": [edge1.spin, edge2.spin],
        "new_edges": [e.spin for e in new_edges],
    }

    # Remove arestas antigas, adiciona novas
    new_foam_edges = [
        e for e in foam.edges
        if not (e.from_node == edge1.from_node and e.to_node == edge1.to_node)
        and not (e.from_node == edge2.from_node and e.to_node == edge2.to_node)
    ]
    new_foam_edges.extend(new_edges)

    # Nova face formada
    new_face = {
        "vertices": [edge1.from_node, edge1.to_node, edge2.from_node, edge2.to_node],
        "area": abs(edge1.spin * edge2.spin) * np.pi,
    }

    return SpinFoam(
        vertices=foam.vertices + [new_vertex],
        edges=new_foam_edges,
        faces=foam.faces + [new_face],
    )


def pachner_move_32(
    foam: SpinFoam,
    triangle: List[SpinEdge],
) -> SpinFoam:
    """
    Movimento de Pachner 3->2.

    Substitui tres arestas formando um triangulo
    por duas arestas compartilhando um vertice.

    Args:
        foam: Espuma de spin atual.
        triangle: Lista de 3 arestas formando o triangulo.

    Returns:
        Espuma apos o movimento 3->2.
    """
    if len(triangle) < 3:
        return foam

    # Novas arestas: media dos spins do triangulo
    avg_spin = sum(e.spin for e in triangle[:3]) / 3

    new_edges = [
        SpinEdge(
            from_node=triangle[0].from_node,
            to_node=triangle[2].to_node,
            spin=avg_spin,
        ),
        SpinEdge(
            from_node=triangle[1].from_node,
            to_node=triangle[2].from_node,
            spin=avg_spin,
        ),
    ]

    # Vertice colapsado
    collapsed_vertex = {
        "type": "32_move",
        "spins": [e.spin for e in triangle[:3]],
        "collapsed_to": avg_spin,
    }

    # Remove arestas do triangulo
    triangle_edges_set = set()
    for e in triangle[:3]:
        triangle_edges_set.add((e.from_node, e.to_node))

    new_foam_edges = [
        e for e in foam.edges
        if (e.from_node, e.to_node) not in triangle_edges_set
    ]
    new_foam_edges.extend(new_edges)

    return SpinFoam(
        vertices=foam.vertices + [collapsed_vertex],
        edges=new_foam_edges,
        faces=foam.faces,
    )


def evolve_to_foam(
    network: SpinNetwork,
    time_steps: int,
) -> SpinFoam:
    """
    Evolui uma rede de spin em uma espuma de spin.

    Aplica movimentos de Pachner iterativamente para
    simular a evolucao temporal da geometria quantica.

    Args:
        network: Rede de spin inicial.
        time_steps: Numero de passos temporais.

    Returns:
        Espuma de spin resultante.
    """
    # Inicializa espuma com a rede atual
    foam = SpinFoam(
        vertices=[{"type": "initial", "node": n.id, "spin": n.spin}
                  for n in network.nodes],
        edges=list(network.edges),
        faces=[],
    )

    for step in range(time_steps):
        # Seleciona arestas para movimentos de Pachner
        if len(foam.edges) < 2:
            break

        # Movimento 2->3 nas duas primeiras arestas
        if len(foam.edges) >= 2:
            foam = pachner_move_23(foam, foam.edges[0], foam.edges[1])

        # Periodicamente aplica 3->2 para manter estabilidade
        if step % 3 == 0 and len(foam.edges) >= 3:
            foam = pachner_move_32(foam, foam.edges[:3])

    return foam


# ─── 3. Amplitude de Espuma ──────────────────────────────────────────────────

def _vertex_amplitude(spins: List[float]) -> float:
    """
    Calcula a amplitudes de vertice (simples).

    A amplitudes de vertice em gravidade quantica de lazos
    e dada pelo simbolo 6j de Wigner (ou sua generalizacao).

    Simplificacao: produto de fatores de normalizacao.
    """
    if len(spins) < 3:
        return 1.0

    amplitude = 1.0
    for s in spins:
        # Fator (2j+1) e contributions de simetria
        amplitude *= np.sqrt(2 * s + 1)

    # Phase factor
    total_spin = sum(spins)
    amplitude *= np.cos(total_spin * np.pi)

    return float(amplitude)


def amplitude(foam: SpinFoam) -> float:
    """
    Calcula a amplitudes total da espuma de spin.

    A amplitudes total e o produto das amplitudes de vertice
    sobre todos os vertices da espuma.

    Args:
        foam: Espuma de spin.

    Returns:
        Amplitudes total (escalar complexo simplificado).
    """
    total_amplitude = 1.0

    # Amplitudes de cada vertice
    for vertex in foam.vertices:
        if "spins" in vertex:
            vertex_amp = _vertex_amplitude(vertex["spins"])
            total_amplitude *= vertex_amp

    # Contribuicao das arestas (fatores de normalizacao)
    for edge in foam.edges:
        total_amplitude *= 1.0 / np.sqrt(2 * edge.spin + 1)

    # Contribuicao das faces (area de Bekenstein-Hawking simplificada)
    for face in foam.faces:
        area = face.get("area", 0)
        total_amplitude *= np.exp(-area / 4)  # fator de Boltzmann

    return float(total_amplitude)


# ─── Funcoes Auxiliares ──────────────────────────────────────────────────────

def validate_network(network: SpinNetwork) -> Dict[str, bool]:
    """
    Valida uma rede de spin verificando consistencia.

    Returns:
        Dicionario com resultados da validacao.
    """
    results = {
        "spins_valid": all(n.spin >= 0 for n in network.nodes),
        "edges_valid": all(e.from_node != e.to_node for e in network.edges),
        "valence_consistent": True,
    }

    # Verifica valencia
    valence_count: Dict[str, int] = {}
    for edge in network.edges:
        valence_count[edge.from_node] = valence_count.get(edge.from_node, 0) + 1
        valence_count[edge.to_node] = valence_count.get(edge.to_node, 0) + 1

    for node in network.nodes:
        if valence_count.get(node.id, 0) != node.valence:
            results["valence_consistent"] = False
            break

    return results


def spin_network_stats(network: SpinNetwork) -> Dict[str, int]:
    """
    Retorna estatisticas de uma rede de spin.
    """
    return {
        "num_nodes": len(network.nodes),
        "num_edges": len(network.edges),
        "num_intertwiners": len(network.intertwiners),
        "total_spin": sum(n.spin for n in network.nodes),
        "avg_valence": (
            sum(n.valence for n in network.nodes) / len(network.nodes)
            if network.nodes else 0
        ),
    }
