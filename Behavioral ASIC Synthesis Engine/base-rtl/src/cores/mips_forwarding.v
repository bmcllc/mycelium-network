// MIPS Forwarding Unit
// Handles EX/MEM -> EX and MEM/WB -> EX forwarding

module mips_forwarding (
    
    // ID/EX register source registers
    input  wire [4:0]  id_ex_rs,
    input  wire [4:0]  id_ex_rt,
    
    // EX/MEM pipeline register
    input  wire [4:0]  ex_mem_rd,
    input  wire        ex_mem_reg_write,
    
    // MEM/WB pipeline register
    input  wire [4:0]  mem_wb_rd,
    input  wire        mem_wb_reg_write,
    
    // Forward control outputs
    // 2'b00: no forwarding (use register file value)
    // 2'b01: forward from MEM/WB
    // 2'b10: forward from EX/MEM
    output reg [1:0]   forward_a,
    output reg [1:0]   forward_b
);

    always @(*) begin
        // Default: no forwarding
        forward_a = 2'b00;
        forward_b = 2'b00;
        
        // EX hazard: EX/MEM rd matches ID/EX rs/rt
        if (ex_mem_reg_write && (ex_mem_rd != 5'd0) && (ex_mem_rd == id_ex_rs)) begin
            forward_a = 2'b10;  // Forward from EX/MEM
        end else if (mem_wb_reg_write && (mem_wb_rd != 5'd0) && (mem_wb_rd == id_ex_rs)) begin
            forward_a = 2'b01;  // Forward from MEM/WB
        end
        
        if (ex_mem_reg_write && (ex_mem_rd != 5'd0) && (ex_mem_rd == id_ex_rt)) begin
            forward_b = 2'b10;  // Forward from EX/MEM
        end else if (mem_wb_reg_write && (mem_wb_rd != 5'd0) && (mem_wb_rd == id_ex_rt)) begin
            forward_b = 2'b01;  // Forward from MEM/WB
        end
    end

endmodule
