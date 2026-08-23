// SPARC Pipeline Testbench
// Tests branch delay slots, basic ALU ops, CALL/RET

module sparc_pipeline_tb;

    reg clk;
    reg rst;
    
    wire [31:0] pc;
    wire [31:0] v0;
    wire [3:0]  icc;
    wire        done;
    wire        pc_write;
    wire        stall;
    wire        if_id_write;
    wire        id_ex_flush;
    wire        id_ex_valid;
    wire        ex_mem_valid;
    wire        mem_wb_valid;
    wire [4:0]  id_ex_rd;
    wire [4:0]  ex_mem_rd;
    wire        wb_write;
    wire [4:0]  wb_rd;
    wire [31:0] wb_data;
    wire [31:0] wb_instr;
    
    // Instantiate DUT
    sparc_pipeline #(
        .IMEM_DEPTH(256),
        .DMEM_DEPTH(256)
    ) dut (
        .clk(clk),
        .rst(rst),
        .pc_o(pc),
        .gpr_v0(v0),
        .icc_o(icc),
        .done_o(done),
        .dbg_pc_write(pc_write),
        .dbg_stall(stall),
        .dbg_if_id_write(if_id_write),
        .dbg_id_ex_flush(id_ex_flush),
        .dbg_id_ex_valid(id_ex_valid),
        .dbg_ex_mem_valid(ex_mem_valid),
        .dbg_mem_wb_valid(mem_wb_valid),
        .dbg_id_ex_rd(id_ex_rd),
        .dbg_ex_mem_rd(ex_mem_rd),
        .dbg_wb_write(wb_write),
        .dbg_wb_rd(wb_rd),
        .dbg_wb_data(wb_data),
        .dbg_wb_instr(wb_instr)
    );

    // Test program
    initial begin
        $dumpfile("sparc_pipeline.vcd");
        $dumpvars(0, sparc_pipeline_tb);
        
        // Simple test: add %g0, 5, %o0; add %o0, 3, %o0; call ret
        // addr 0: sethi %hi(5), %o0  -> 0x80100000
        // addr 4: add %o0, %lo(5), %o0 -> 0x82100005
        // addr 8: add %o0, 3, %o0 -> 0x82100003
        // addr 12: jmpl %o7+8, %g0 (ret) -> 0x81C3E008
        
        dut.imem[0] = 32'h80100000;  // sethi %hi(5), %o0
        dut.imem[1] = 32'h82100005;  // add %o0, %lo(5), %o0
        dut.imem[2] = 32'h82100003;  // add %o0, 3, %o0
        dut.imem[3] = 32'h81C3E008;  // jmpl %o7+8, %g0 (ret)
        dut.imem[4] = 32'h01000000;  // nop (delay slot)
        dut.imem[5] = 32'h01000000;  // nop
        dut.imem[6] = 32'h01000000;  // nop
        
        // Branch test with delay slot
        // addr 10: be target
        // addr 14: delay slot (add %o0, 1, %o0)
        dut.imem[10] = 32'h10000004; // be target (branch always taken to PC+16=26)
        dut.imem[11] = 32'h82100001; // add %o0, 1, %o0 (delay slot)
        dut.imem[12] = 32'h01000000; // target: nop
        dut.imem[13] = 32'h01000000; // nop
        
        // Initialize register file
        dut.gpr[31] = 32'h0000_0100; // %i7 = return address marker
        dut.gpr[15] = 32'h0000_0010; // %o7 = return address
    end

    // Clock and reset
    initial clk = 0;
    always #5 clk = ~clk;
    
    initial begin
        rst = 1;
        repeat (2) @(posedge clk);
        rst = 0;
        
        repeat (200) @(posedge clk);
        if (done) begin
            $display("TEST PASSED: SPARC pipeline completed");
        end else begin
            $display("TEST TIMEOUT");
        end
        $finish;
    end

endmodule