// MIPS 5-Stage Pipeline Core
// Stages: IF -> ID -> EX -> MEM -> WB
// With forwarding and hazard detection

module mips_pipeline #(
    parameter IMEM_DEPTH = 256,
    parameter DMEM_DEPTH = 256
) (
    input  wire         clk,
    input  wire         rst,
    output wire [31:0]  pc_o,
    output wire [31:0]  gpr_v0,  // $v0 for result checking
    output wire         done_o,
    // Debug outputs
    output wire         dbg_pc_write,
    output wire         dbg_stall,
    output wire         dbg_if_id_write,
    output wire         dbg_id_ex_flush,
    output wire         dbg_id_ex_valid,
    output wire         dbg_ex_mem_valid,
    output wire         dbg_mem_wb_valid,
    output wire         dbg_id_jr_taken,
    output wire [31:0]  dbg_jr_target,
    output wire         dbg_id_branch_taken,
    output wire [31:0]  dbg_pc_next,
    output wire [31:0]  dbg_if_id_pc,
    output wire [31:0]  dbg_if_id_instr,
    output wire         dbg_wb_write,
    output wire [4:0]   dbg_wb_rd,
    output wire [31:0]  dbg_wb_data,
    output wire [31:0]  dbg_wb_instr
);

    // ============================================================
    // PIPELINE REGISTERS
    // ============================================================
    
    // IF/ID
    reg [31:0] if_id_pc;
    reg [31:0] if_id_instr;
    reg        if_id_valid;
    
    // ID/EX
    reg [31:0] id_ex_pc;
    reg [31:0] id_ex_rs_val;
    reg [31:0] id_ex_rt_val;
    reg [31:0] id_ex_imm;
    reg [4:0]  id_ex_rs;
    reg [4:0]  id_ex_rt;
    reg [4:0]  id_ex_rd;
    reg [5:0]  id_ex_opcode;
    reg [5:0]  id_ex_funct;
    reg [4:0]  id_ex_shamt;
    reg        id_ex_reg_write;
    reg        id_ex_mem_write;
    reg        id_ex_mem_to_reg;
    reg        id_ex_alu_src;
    reg [1:0]  id_ex_alu_op;
    reg        id_ex_jal;
    reg [31:0] id_ex_instr;
    reg        id_ex_valid;
    
    // EX/MEM
    reg [31:0] ex_mem_alu_result;
    reg [31:0] ex_mem_rt_val;
    reg [4:0]  ex_mem_rd;
    reg [5:0]  ex_mem_opcode;
    reg        ex_mem_reg_write;
    reg        ex_mem_mem_write;
    reg        ex_mem_mem_to_reg;
    reg [31:0] ex_mem_instr;
    reg        ex_mem_valid;
    
    // MEM/WB
    reg [31:0] mem_wb_write_data;
    reg [4:0]  mem_wb_rd;
    reg        mem_wb_reg_write;
    reg        mem_wb_valid;
    
    // ============================================================
    // REGISTER FILE
    // ============================================================
    reg [31:0] gpr [0:31];
    
    // ============================================================
    // INSTRUCTION MEMORY
    // ============================================================
    reg [31:0] imem [0:IMEM_DEPTH-1];
    
    // ============================================================
    // DATA MEMORY
    // ============================================================
    reg [31:0] dmem [0:DMEM_DEPTH-1];
    
    // ============================================================
    // PC REGISTER
    // ============================================================
    reg [31:0] pc;
    
    // ============================================================
    // CONTROL SIGNALS
    // ============================================================
    wire       pc_write;
    wire       if_id_write;
    wire       if_id_flush;
    wire       id_ex_flush;
    wire       stall;
    
    // ============================================================
    // HAZARD DETECTION
    // ============================================================
    wire        id_branch_taken;
    wire [5:0]  id_opcode = if_id_instr[31:26];
    wire [4:0]  id_rs     = if_id_instr[25:21];
    wire [4:0]  id_rt     = if_id_instr[20:16];
    
    mips_hazard hazard_unit (
        .id_rs(id_rs),
        .id_rt(id_rt),
        .id_branch_taken(id_branch_taken),
        .id_is_branch(id_branch),
        .id_jr_taken(id_jr_taken),
        .ex_opcode(id_ex_opcode),
        .ex_rt(id_ex_rt),
        .mem_rd(ex_mem_rd),
        .mem_reg_write(ex_mem_reg_write),
        .wb_rd(mem_wb_rd),
        .wb_reg_write(mem_wb_reg_write),
        .pc_write(pc_write),
        .if_id_write(if_id_write),
        .if_id_flush(if_id_flush),
        .id_ex_flush(id_ex_flush),
        .stall(stall)
    );
    
    // ============================================================
    // FORWARDING UNIT
    // ============================================================
    wire [1:0] forward_a, forward_b;
    
    mips_forwarding forward_unit (
        .id_ex_rs(id_ex_rs),
        .id_ex_rt(id_ex_rt),
        .ex_mem_rd(ex_mem_rd),
        .ex_mem_reg_write(ex_mem_reg_write),
        .mem_wb_rd(mem_wb_rd),
        .mem_wb_reg_write(mem_wb_reg_write),
        .forward_a(forward_a),
        .forward_b(forward_b)
    );
    
    // ============================================================
    // IF STAGE - Instruction Fetch
    // ============================================================
    wire [31:0] pc_plus4 = pc + 32'd4;
    
    // Branch target calculation in ID stage (PC+4 + sign-extended immediate << 2)
    wire [31:0] branch_offset = {{14{if_id_instr[15]}}, if_id_instr[15:0], 2'b00};
    wire [31:0] branch_target = if_id_pc + 32'd4 + branch_offset[31:0];
    
    // pc_next is now assigned in ID stage with JR support
    
    always @(posedge clk) begin
        if (rst) begin
            pc <= 32'h0000_0000;
        end else if (pc_write) begin
            pc <= pc_next;
        end
    end
    
    // IF/ID pipeline register
    always @(posedge clk) begin
        if (rst) begin
            if_id_pc     <= 32'h0;
            if_id_instr  <= 32'h0;
            if_id_valid  <= 1'b0;
        end else if (if_id_write) begin
            if_id_pc     <= pc;
            if_id_instr  <= imem[pc[9:2]];
            if_id_valid  <= 1'b1;
        end else if (if_id_flush) begin
            if_id_valid  <= 1'b0;
        end
    end
    
    // ============================================================
    // ID STAGE - Instruction Decode / Register Fetch
    // ============================================================
    wire [5:0]  opcode = if_id_instr[31:26];
    wire [4:0]  rs     = if_id_instr[25:21];
    wire [4:0]  rt     = if_id_instr[20:16];
    wire [4:0]  rd     = if_id_instr[15:11];
    wire [4:0]  shamt  = if_id_instr[10:6];
    wire [5:0]  funct  = if_id_instr[5:0];
    wire [15:0] imm16  = if_id_instr[15:0];
    wire [31:0] sext_imm = {{16{imm16[15]}}, imm16};
    
    // Register file read
    wire [31:0] rs_val_rf = gpr[rs];
    wire [31:0] rt_val_rf = gpr[rt];
    
    // Forwarding for branch comparison AND register reads (ID stage)
    // Check EX/MEM stage
    wire rs_ex_hazard = ex_mem_reg_write && ex_mem_valid && (ex_mem_rd != 5'd0) && (ex_mem_rd == rs);
    wire rt_ex_hazard = ex_mem_reg_write && ex_mem_valid && (ex_mem_rd != 5'd0) && (ex_mem_rd == rt);
    
    // Check MEM/WB stage
    wire rs_mem_hazard = mem_wb_reg_write && mem_wb_valid && (mem_wb_rd != 5'd0) && (mem_wb_rd == rs);
    wire rt_mem_hazard = mem_wb_reg_write && mem_wb_valid && (mem_wb_rd != 5'd0) && (mem_wb_rd == rt);
    
    // Forwarded values for branch comparison AND register reads
    // WB writes at negedge, so register file read at next posedge sees new value
    wire [31:0] rs_val = rs_ex_hazard ? ex_mem_alu_result :
                         rs_mem_hazard ? mem_wb_write_data :
                         rs_val_rf;
    wire [31:0] rt_val = rt_ex_hazard ? ex_mem_alu_result :
                         rt_mem_hazard ? mem_wb_write_data :
                         rt_val_rf;
    
    // Branch condition evaluation (for beq, bne, etc.)
    wire        branch_cond = (opcode == 6'h04) ? (rs_val == rt_val) :  // beq
                              (opcode == 6'h05) ? (rs_val != rt_val) :  // bne
                              (opcode == 6'h01) ? (rs_val[31] != 1'b0) :  // bltz/bgez (simplified)
                              1'b0;
    
    // JR handling - resolved in ID stage using register file
    wire        id_jr_taken = if_id_valid && (opcode == 6'h00) && (funct == 6'h08);
    wire [31:0] jr_target = rs_val;  // rs_val already has forwarding
    
    assign id_branch_taken = if_id_valid && (id_opcode == 6'h04 || id_opcode == 6'h05 || id_opcode == 6'h01) && branch_cond;
    
    // PC next selection
    wire [31:0] pc_next;
    assign pc_next = id_jr_taken ? jr_target : 
                     id_branch_taken ? branch_target : pc_plus4;
    
    // Control signal generation
    reg         id_reg_write;
    reg         id_mem_write;
    reg         id_mem_to_reg;
    reg         id_alu_src;
    reg [1:0]   id_alu_op;
    reg         id_branch;
    reg         id_jal;
    
    always @(*) begin
        // Defaults
        id_reg_write    = 1'b0;
        id_mem_write    = 1'b0;
        id_mem_to_reg   = 1'b0;
        id_alu_src      = 1'b0;
        id_alu_op       = 2'b00;
        id_branch       = 1'b0;
        id_jal          = 1'b0;
        
        if (if_id_valid) begin
            case (opcode)
                6'h00: begin // R-type
                    id_reg_write  = 1'b1;
                    id_alu_op     = 2'b10;
                    if (funct == 6'h09) begin       // jalr
                        id_reg_write = 1'b1;
                        id_jal       = 1'b1;
                    end
                end
                6'h08, 6'h09: begin // addi, addiu
                    id_reg_write  = 1'b1;
                    id_alu_src    = 1'b1;
                    id_alu_op     = 2'b00;
                end
                6'h0A: begin // slti
                    id_reg_write  = 1'b1;
                    id_alu_src    = 1'b1;
                    id_alu_op     = 2'b11;
                end
                6'h0F: begin // lui
                    id_reg_write  = 1'b1;
                    id_alu_src    = 1'b1;
                    id_alu_op     = 2'b00; // handled specially in EX
                end
                6'h23: begin // lw
                    id_reg_write  = 1'b1;
                    id_mem_to_reg = 1'b1;
                    id_alu_src    = 1'b1;
                    id_alu_op     = 2'b00;
                end
                6'h2B: begin // sw
                    id_mem_write  = 1'b1;
                    id_alu_src    = 1'b1;
                    id_alu_op     = 2'b00;
                end
                6'h04, 6'h05: begin // beq, bne
                    id_branch     = 1'b1;
                    id_alu_op     = 2'b01;
                end
                6'h03: begin // jal
                    id_reg_write  = 1'b1;
                    id_jal        = 1'b1;
                    id_mem_to_reg = 1'b1; // link value in write_data
                end
                default: ;
            endcase
        end
    end
    
    // Determine destination register for ID/EX
    wire [4:0] id_dst_reg = (opcode == 6'h00) ? rd :           // R-type: rd
                            (opcode == 6'h03) ? 5'd31 :          // JAL: $ra
                            rt;                                   // I-type: rt
    
    // ID/EX pipeline register
    always @(posedge clk) begin
        if (rst || id_ex_flush) begin
            id_ex_pc         <= 32'h0;
            id_ex_rs_val     <= 32'h0;
            id_ex_rt_val     <= 32'h0;
            id_ex_imm        <= 32'h0;
            id_ex_rs         <= 5'h0;
            id_ex_rt         <= 5'h0;
            id_ex_rd         <= 5'h0;
            id_ex_opcode     <= 6'h0;
            id_ex_funct      <= 6'h0;
            id_ex_shamt      <= 5'h0;
            id_ex_reg_write  <= 1'b0;
            id_ex_mem_write  <= 1'b0;
            id_ex_mem_to_reg <= 1'b0;
            id_ex_alu_src    <= 1'b0;
            id_ex_alu_op     <= 2'b00;
            id_ex_jal        <= 1'b0;
            id_ex_instr      <= 32'h0;
            id_ex_valid      <= 1'b0;
        end else begin
            id_ex_pc         <= if_id_pc;
            id_ex_rs_val     <= rs_val;
            id_ex_rt_val     <= rt_val;
            id_ex_imm        <= sext_imm;
            id_ex_rs         <= rs;
            id_ex_rt         <= rt;
            id_ex_rd         <= id_dst_reg;
            id_ex_opcode     <= opcode;
            id_ex_funct      <= funct;
            id_ex_shamt      <= shamt;
            id_ex_reg_write  <= id_reg_write;
            id_ex_mem_write  <= id_mem_write;
            id_ex_mem_to_reg <= id_mem_to_reg;
            id_ex_alu_src    <= id_alu_src;
            id_ex_alu_op     <= id_alu_op;
            id_ex_jal        <= id_jal;
            id_ex_instr      <= if_id_instr;
            id_ex_valid      <= if_id_valid;
        end
    end
    
    // ============================================================
    // EX STAGE - Execute / ALU
    // ============================================================
    reg [31:0] alu_in_a;
    wire [31:0] alu_in_b;
    
    // Forwarding mux for ALU input A
    always @(*) begin
        case (forward_a)
            2'b10: alu_in_a = ex_mem_alu_result;
            2'b01: alu_in_a = mem_wb_write_data;
            default: alu_in_a = id_ex_rs_val;
        endcase
    end
    
    // Forwarding mux for ALU input B
    reg [31:0] rt_val_fwd;
    always @(*) begin
        case (forward_b)
            2'b10: rt_val_fwd = ex_mem_alu_result;
            2'b01: rt_val_fwd = mem_wb_write_data;
            default: rt_val_fwd = id_ex_rt_val;
        endcase
    end
    
    assign alu_in_b = id_ex_alu_src ? id_ex_imm : rt_val_fwd;
    
    // ALU operation
    reg [31:0] alu_result;
    
    always @(*) begin
        alu_result = 32'h0;
        
        if (id_ex_valid) begin
            case (id_ex_alu_op)
                2'b00: begin // ADD / ADDI / LW / SW / LUI
                    if (id_ex_opcode == 6'h0F) begin // LUI
                        alu_result = id_ex_imm << 16;
                    end else begin
                        alu_result = alu_in_a + alu_in_b;
                    end
                end
                2'b01: begin // Branch (subtract for comparison)
                    alu_result = alu_in_a - alu_in_b;
                end
                2'b10: begin // R-type
                    case (id_ex_funct)
                        6'h21: alu_result = alu_in_a + alu_in_b; // addu
                        6'h23: alu_result = alu_in_a - alu_in_b; // subu
                        6'h2A: alu_result = {31'b0, $signed(alu_in_a) < $signed(alu_in_b)}; // slt
                        6'h00: alu_result = alu_in_b << id_ex_shamt; // sll
                        6'h02: alu_result = alu_in_b >> id_ex_shamt; // srl
                        6'h24: alu_result = alu_in_a & alu_in_b; // and
                        6'h25: alu_result = alu_in_a | alu_in_b; // or
                        6'h27: alu_result = ~(alu_in_a | alu_in_b); // nor
                        default: alu_result = 32'h0;
                    endcase
                end
                2'b11: begin // SLTI
                    alu_result = {31'b0, $signed(alu_in_a) < $signed(alu_in_b)};
                end
            endcase
        end
    end
    
    // Determine destination register
    wire [4:0] ex_rd = (id_ex_opcode == 6'h00) ? id_ex_rd : 
                       (id_ex_jal) ? 5'd31 : 
                       id_ex_rt;
    
    // EX/MEM pipeline register
    always @(posedge clk) begin
        if (rst) begin
            ex_mem_alu_result <= 32'h0;
            ex_mem_rt_val     <= 32'h0;
            ex_mem_rd         <= 5'h0;
            ex_mem_opcode     <= 6'h0;
            ex_mem_reg_write  <= 1'b0;
            ex_mem_mem_write  <= 1'b0;
            ex_mem_mem_to_reg <= 1'b0;
            ex_mem_instr      <= 32'h0;
            ex_mem_valid      <= 1'b0;
        end else begin
            ex_mem_alu_result <= alu_result;
            ex_mem_rt_val     <= rt_val_fwd;
            ex_mem_rd         <= ex_rd;
            ex_mem_opcode     <= id_ex_opcode;
            ex_mem_reg_write  <= id_ex_reg_write && id_ex_valid;
            ex_mem_mem_write  <= id_ex_mem_write && id_ex_valid;
            ex_mem_mem_to_reg <= id_ex_mem_to_reg && id_ex_valid;
            ex_mem_instr      <= id_ex_instr;
            ex_mem_valid      <= id_ex_valid;
        end
    end
    
    // ============================================================
    // MEM STAGE - Memory Access
    // ============================================================
    // verilator lint_off UNUSEDSIGNAL
    wire [31:0] mem_addr = ex_mem_alu_result;
    wire [31:0] mem_read_data = dmem[mem_addr[9:2]];
    
    // Memory write
    always @(posedge clk) begin
        if (ex_mem_mem_write && ex_mem_valid) begin
            dmem[mem_addr[9:2]] <= ex_mem_rt_val;
        end
    end
    
    // MEM/WB pipeline register
    always @(posedge clk) begin
        if (rst) begin
            mem_wb_write_data <= 32'h0;
            mem_wb_rd         <= 5'h0;
            mem_wb_reg_write  <= 1'b0;
            mem_wb_valid      <= 1'b0;
        end else begin
            // For JAL, write PC+4 to $ra
            if (ex_mem_valid && ex_mem_mem_to_reg && ex_mem_opcode == 6'h03) begin
                mem_wb_write_data <= ex_mem_pc + 32'd4; // Need to track PC
            end else if (ex_mem_mem_to_reg) begin
                mem_wb_write_data <= mem_read_data;
            end else begin
                mem_wb_write_data <= ex_mem_alu_result;
            end
            mem_wb_rd        <= ex_mem_rd;
            mem_wb_reg_write <= ex_mem_reg_write && ex_mem_valid;
            mem_wb_valid     <= ex_mem_valid;
        end
    end
    
    // Need to track PC in EX/MEM for JAL
    reg [31:0] ex_mem_pc;
    always @(posedge clk) begin
        if (rst) begin
            ex_mem_pc <= 32'h0;
        end else begin
            ex_mem_pc <= id_ex_pc;
        end
    end
    
    // ============================================================
    // WB STAGE - Write Back (at negedge to avoid read-during-write hazard)
    // ============================================================
    always @(negedge clk) begin
        if (mem_wb_reg_write && mem_wb_valid && (mem_wb_rd != 5'd0)) begin
            gpr[mem_wb_rd] <= mem_wb_write_data;
        end
    end
    
    // Track instruction in WB stage
    reg [31:0] wb_instr;
    always @(posedge clk) begin
        wb_instr <= ex_mem_instr;
    end
    
    // WB Debug
    assign dbg_wb_write = mem_wb_reg_write && mem_wb_valid && (mem_wb_rd != 5'd0);
    assign dbg_wb_instr = wb_instr;
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
initial begin
        gpr[31] = 32'h0000_0100;  // $ra = success marker (0x100)
        
        // Simple fib(10) test program
        imem[0] = 32'h2404000A;  // li $a0, 10        (addr 0)
        imem[1] = 32'h24020000;  // li $v0, 0         (addr 4)
        imem[2] = 32'h24030001;  // li $v1, 1         (addr 8)
        imem[3] = 32'h1080000C;  // beq $a0, $zero, done (addr 12) - branch to 12+4+12*4=64
        imem[4] = 32'h2084FFFF;  // addi $a0, $a0, -1 (addr 16) - loop start
        imem[5] = 32'h00434021;  // addu $t0, $v0, $v1 (addr 20)
        imem[6] = 32'h00601021;  // addu $v0, $v1, $zero = move $v0, $v1 (addr 24) - CORRECTED rd=2
        imem[7] = 32'h01001821;  // addu $v1, $t0, $zero = move $v1, $t0 (addr 28) - CORRECTED
        imem[8] = 32'h1480FFFB;  // bne $a0, $zero, loop (addr 32) - offset -5, target = 36 + (-5)*4 = 16
        imem[9] = 32'h03E00008;  // jr $ra            (addr 36)
        imem[10] = 32'h00000000; // nop (addr 40)
        imem[11] = 32'h00000000; // nop (addr 44)
        imem[12] = 32'h00000000; // nop (addr 48)
        imem[13] = 32'h00000000; // done: nop (addr 52)
        imem[14] = 32'h00000000; // nop (addr 56)
        
        for (integer i = 0; i < DMEM_DEPTH; i = i + 1)
            dmem[i] = 32'h0;
    end
    
    // ============================================================
    // OUTPUTS
    // ============================================================
    assign pc_o   = pc;
    assign gpr_v0 = gpr[2]; // $v0 = register 2
    assign done_o = (pc == 32'h0) && (if_id_valid == 1'b0) && (id_ex_valid == 1'b0);
    
    // Debug outputs
    assign dbg_pc_write       = pc_write;
    assign dbg_stall          = stall;
    assign dbg_if_id_write    = if_id_write;
    assign dbg_id_ex_flush    = id_ex_flush;
    assign dbg_id_ex_valid    = id_ex_valid;
    assign dbg_ex_mem_valid   = ex_mem_valid;
    assign dbg_mem_wb_valid   = mem_wb_valid;
    assign dbg_id_jr_taken    = id_jr_taken;
    assign dbg_jr_target      = jr_target;
    assign dbg_id_branch_taken = id_branch_taken;
    assign dbg_pc_next        = pc_next;
    assign dbg_if_id_pc       = if_id_pc;
    assign dbg_if_id_instr    = if_id_instr;
    assign dbg_wb_rd          = mem_wb_rd;
    assign dbg_wb_data        = mem_wb_write_data;
    assign dbg_wb_instr       = wb_instr;

endmodule
