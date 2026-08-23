// MIPS Hazard Detection Unit
// Detects load-use hazards and branch hazards

module mips_hazard (
    
    // ID stage info
    input  wire [4:0]  id_rs,
    input  wire [4:0]  id_rt,
    input  wire        id_branch_taken,
    input  wire        id_is_branch,
    input  wire        id_jr_taken,
    
    // EX stage info
    input  wire [5:0]  ex_opcode,
    input  wire [4:0]  ex_rt,
    
    // MEM stage info
    input  wire [4:0]  mem_rd,
    input  wire        mem_reg_write,
    
    // WB stage info
    input  wire [4:0]  wb_rd,
    input  wire        wb_reg_write,
    
    // Control outputs
    output reg         pc_write,
    output reg         if_id_write,
    output reg         if_id_flush,
    output reg         id_ex_flush,
    output reg         stall
);

    // Load-use hazard: EX stage is a load (lw) and destination register 
    // matches source register in ID stage
    wire load_use_hazard = (ex_opcode == 6'h23) &&  // Only for lw
                           (ex_rt != 5'd0) && 
                           ((ex_rt == id_rs) || (ex_rt == id_rt));
    
    // Branch register hazard: branch in ID needs register that's being written
    // by instruction in EX, MEM, or WB
    // Check all pipeline stages since ID/EX may be flushed
    wire mem_hazard = mem_reg_write && (mem_rd != 5'd0) && ((mem_rd == id_rs) || (mem_rd == id_rt));
    wire wb_hazard = wb_reg_write && (wb_rd != 5'd0) && ((wb_rd == id_rs) || (wb_rd == id_rt));
    
    // Only stall for MEM/WB hazards (already computed).
    // EX hazard (instruction in ID/EX) will be resolved by forwarding from EX/MEM in next cycle.
    wire branch_reg_hazard = id_is_branch && (mem_hazard || wb_hazard);
    
    // Branch taken in ID stage - flush IF/ID
    wire branch_hazard = id_branch_taken;
    
    // JR taken in ID stage - flush IF/ID
    wire jr_hazard = id_jr_taken;
    
    always @(*) begin
        // Default values
        pc_write     = 1'b1;
        if_id_write  = 1'b1;
        if_id_flush  = 1'b0;
        id_ex_flush  = 1'b0;
        stall        = 1'b0;
        
        if (load_use_hazard) begin
            // Stall pipeline: hold PC, hold IF/ID, flush ID/EX
            pc_write     = 1'b0;
            if_id_write  = 1'b0;
            if_id_flush  = 1'b0;
            id_ex_flush  = 1'b1;
            stall        = 1'b1;
        end else if (branch_reg_hazard) begin
            // Stall until register is available
            pc_write     = 1'b0;
            if_id_write  = 1'b0;
            if_id_flush  = 1'b0;
            id_ex_flush  = 1'b1;
            stall        = 1'b1;
        end else if (branch_hazard) begin
            // Branch taken: flush IF/ID, let ID/EX continue
            pc_write     = 1'b1;
            if_id_write  = 1'b0;
            if_id_flush  = 1'b1;
            id_ex_flush  = 1'b0;
            stall        = 1'b0;
        end else if (jr_hazard) begin
            // JR taken: flush IF/ID
            pc_write     = 1'b1;
            if_id_write  = 1'b0;
            if_id_flush  = 1'b1;
            id_ex_flush  = 1'b0;
            stall        = 1'b0;
        end
    end

endmodule
