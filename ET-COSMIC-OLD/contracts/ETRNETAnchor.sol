// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ETRNETAnchor
 * @notice Âncora de finalidade para o ETRNET.
 * Armazena periodicamente a Merkle root do estado dos UTXOs,
 * fornecendo finalidade contra reorganizações profundas.
 *
 * A DAO (multi-sig) é a única que pode atualizar a raiz.
 * Qualquer um pode verificar a raiz mais recente.
 */
contract ETRNETAnchor {
    bytes32 public currentRoot;
    uint256 public lastUpdate;
    address public daoMultisig;
    uint256 public updateCount;

    uint256 public constant CHALLENGE_PERIOD = 1 hours;
    uint256 public constant CHALLENGE_STAKE = 0.01 ether;

    bytes32 public pendingRoot;
    uint256 public pendingTimestamp;

    event RootProposed(bytes32 indexed newRoot, uint256 timestamp, uint256 updateNumber);
    event RootFinalized(bytes32 indexed root, uint256 timestamp);
    event RootChallenged(bytes32 indexed challengedRoot, address challenger);

    modifier onlyDAO() {
        require(msg.sender == daoMultisig, "ETRNETAnchor: only DAO multisig");
        _;
    }

    constructor(address _daoMultisig) {
        require(_daoMultisig != address(0), "invalid DAO address");
        daoMultisig = _daoMultisig;
    }

    /**
     * @notice Propõe uma nova Merkle root (inicia período de desafio)
     * @param _newRoot A nova raiz Merkle do estado dos UTXOs
     */
    function proposeRoot(bytes32 _newRoot) external onlyDAO {
        require(_newRoot != bytes32(0), "empty root");
        pendingRoot = _newRoot;
        pendingTimestamp = block.timestamp;
        emit RootProposed(_newRoot, block.timestamp, updateCount + 1);
    }

    /**
     * @notice Finaliza a raiz pendente após o período de desafio
     */
    function finalizeRoot() external {
        require(pendingRoot != bytes32(0), "no pending root");
        require(block.timestamp >= pendingTimestamp + CHALLENGE_PERIOD, "challenge period not elapsed");

        currentRoot = pendingRoot;
        lastUpdate = block.timestamp;
        updateCount++;

        emit RootFinalized(pendingRoot, block.timestamp);

        pendingRoot = bytes32(0);
        pendingTimestamp = 0;
    }

    /**
     * @notice Registra um desafio à raiz pendente
     * @dev Requer stake para prevenir DoS. Stake é reembolsado.
     */
    function challengeRoot() external payable {
        require(pendingRoot != bytes32(0), "no pending root");
        require(block.timestamp < pendingTimestamp + CHALLENGE_PERIOD, "challenge period elapsed");
        require(msg.value >= CHALLENGE_STAKE, "insufficient stake");

        emit RootChallenged(pendingRoot, msg.sender);

        // Reembolsa stake (em produção, stake seria retido até resolução)
        payable(msg.sender).transfer(msg.value);

        // Cancela raiz pendente
        pendingRoot = bytes32(0);
        pendingTimestamp = 0;
    }

    receive() external payable {}

    /**
     * @notice Atualiza o endereço da DAO (only current DAO)
     * @param _newDao Novo endereço multi-sig
     */
    function updateDAO(address _newDao) external onlyDAO {
        require(_newDao != address(0), "invalid address");
        daoMultisig = _newDao;
    }

    /**
     * @notice Verifica se uma raiz é a atual
     * @param _root Raiz a verificar
     */
    function isCurrentRoot(bytes32 _root) external view returns (bool) {
        if (currentRoot == bytes32(0)) return false;
        return _root == currentRoot;
    }

    /**
     * @notice Retorna informações sobre o estado atual
     */
    function getState() external view returns (
        bytes32 root,
        uint256 updatedAt,
        uint256 count,
        bytes32 pending,
        uint256 pendingAt
    ) {
        return (currentRoot, lastUpdate, updateCount, pendingRoot, pendingTimestamp);
    }
}
