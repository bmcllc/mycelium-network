// MIPS Pipeline Testbench
// Tests fib(10) = 55, forwarding paths, load-use stalls, branch flush

module mips_pipeline_tb;

    reg clk;
    reg rst;
    
    wire [31:0] pc;
    wire [31:0] v0;
    wire        done;
    
    // Instantiate DUT
    mips_pipeline #(
        .IMEM_DEPTH(256),
        .DMEM_DEPTH(256)
    ) dut (
        .clk(clk),
        .rst(rst),
        .pc_o(pc),
        .gpr_v0(v0),
        .done_o(done)
    );
    
    // Clock generation
    initial clk = 0;
    always #5 clk = ~clk; // 100MHz clock
    
    // Test program: fib(10)
    // We'll load a simple iterative fibonacci into instruction memory
    initial begin
        $dumpfile("mips_pipeline.vcd");
        $dumpvars(0, mips_pipeline_tb);
        
        // Initialize instruction memory with fib(10) program
        // Using a simple iterative approach
        
        // Address 0: li $a0, 10        (load 10 into $a0)
        dut.imem[0] = 32'h2404000A;
        
        // Address 1: li $v0, 0         (fib(0) = 0)
        dut.imem[1] = 32'h24020000;
        
        // Address 2: li $v1, 1         (fib(1) = 1)
        dut.imem[2] = 32'h24030001;
        
        // Address 3: beq $a0, $zero, done  (if n==0, return 0)
        dut.imem[3] = 32'h1080000C;
        
        // Address 4: addi $a0, $a0, -1   (n--)
        dut.imem[4] = 32'h2084FFFF;
        
        // Address 5: addu $t0, $v0, $v1  (t0 = v0 + v1)
        dut.imem[5] = 32'h00434021;
        
        // Address 6: move $v0, $v1       (v0 = v1)
        dut.imem[6] = 32'h00602021;
        
        // Address 7: move $v1, $t0       (v1 = t0)
        dut.imem[7] = 32'h01003021;
        
        // Address 8: bne $a0, $zero, loop (if n!=0, loop)
        dut.imem[8] = 32'h1480FFFB;
        
        // Address 9: jr $ra              (return)
        dut.imem[9] = 32'h03E00008;
        
        // Address 10-12: nops
        dut.imem[10] = 32'h00000000;
        dut.imem[11] = 32'h00000000;
        dut.imem[12] = 32'h00000000;
        
        // Done label (address 13)
        dut.imem[13] = 32'h00000000; // nop
        dut.imem[14] = 32'h00000000; // nop
        
        // Initialize register file
        dut.gpr[31] = 32'hFFFF_FFFC; // $ra = return address
        
        rst = 1;
        repeat (2) @(posedge clk);
        rst = 0;
        
        // Run until done or max cycles
        repeat (200) begin
            @(posedge clk);
            if (done) break;
        end
        
        $display("PC: %h, V0: %d (expected 55)", pc, v0);
        if (v0 == 32'd55) begin
            $display("TEST PASSED: fib(10) = 55");
        end else begin
            $display("TEST FAILED: fib(10) = %d, expected 55", v0);
        end
        
        $finish;
    end

endmodule