// SPARC V8 5-stage pipeline
// ponytail: forwarding and branch delay slots skipped

module sparc_pipeline(
    input  wire        clk,
    input  wire        rst_n,
    output wire [31:0] imem_addr,
    input  wire [31:0] imem_data,
    output wire [31:0] dmem_addr,
    output wire [31:0] dmem_wdata,
    input  wire [31:0] dmem_rdata,
    output wire        dmem_we,
    output wire        dmem_en
);

    reg [31:0] pc;
    reg [31:0] if_id_inst;
    reg        if_id_valid;

    assign imem_addr = pc;

    wire [1:0]  op     = if_id_inst[31:30];
    wire [4:0]  rd     = if_id_inst[29:25];
    wire [5:0]  op3    = if_id_inst[24:19];
    wire [4:0]  rs1    = if_id_inst[18:14];
    wire        i_bit  = if_id_inst[13];
    wire [4:0]  rs2    = if_id_inst[4:0];
    wire [12:0] simm13 = if_id_inst[12:0];

    wire [31:0] ext_simm13 = {{19{simm13[12]}}, simm13};

    reg [31:0] regs[0:31];

    wire [31:0] rs1_data = (rs1 == 0) ? 32'd0 : regs[rs1];
    wire [31:0] rs2_data = (rs2 == 0) ? 32'd0 : regs[rs2];

    wire [31:0] id_alu_in1 = rs1_data;
    wire [31:0] id_alu_in2 = i_bit ? ext_simm13 : rs2_data;

    // ID/EX
    reg [31:0] id_ex_alu_in1;
    reg [31:0] id_ex_alu_in2;
    reg [4:0]  id_ex_rd;
    reg [5:0]  id_ex_op3;
    reg [1:0]  id_ex_op;
    reg        id_ex_valid;
    reg [31:0] id_ex_rs2_data;

    // EX/MEM
    reg [31:0] ex_mem_alu_out;
    reg [4:0]  ex_mem_rd;
    reg [1:0]  ex_mem_op;
    reg [5:0]  ex_mem_op3;
    reg        ex_mem_valid;
    reg [31:0] ex_mem_store_data;

    assign dmem_addr  = ex_mem_alu_out;
    assign dmem_wdata = ex_mem_store_data;
    assign dmem_en    = ex_mem_valid && (ex_mem_op == 2'b11);
    assign dmem_we    = dmem_en && (ex_mem_op3 == 6'b000100);

    // MEM/WB
    reg [31:0] mem_wb_alu_out;
    reg [31:0] mem_wb_mem_out;
    reg [4:0]  mem_wb_rd;
    reg [1:0]  mem_wb_op;
    reg [5:0]  mem_wb_op3;
    reg        mem_wb_valid;

    wire wb_is_load = (mem_wb_op == 2'b11) && (mem_wb_op3 == 6'b000000);
    wire wb_is_alu  = (mem_wb_op == 2'b10);
    wire wb_en      = mem_wb_valid && (mem_wb_rd != 0) && (wb_is_load || wb_is_alu);
    wire [31:0] wb_data = wb_is_load ? mem_wb_mem_out : mem_wb_alu_out;

    integer i;
    initial begin
        for(i = 0; i < 32; i = i + 1) regs[i] = 0;
    end

    // Pipeline: single always block, WB->MEM->EX->ID->IF order
    // so each stage reads OLD values of downstream stages
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pc            <= 0;
            if_id_inst    <= 0;
            if_id_valid   <= 0;
            id_ex_alu_in1 <= 0;
            id_ex_alu_in2 <= 0;
            id_ex_rd      <= 0;
            id_ex_op3     <= 0;
            id_ex_op      <= 0;
            id_ex_valid   <= 0;
            id_ex_rs2_data <= 0;
            ex_mem_alu_out <= 0;
            ex_mem_rd     <= 0;
            ex_mem_op     <= 0;
            ex_mem_op3    <= 0;
            ex_mem_valid  <= 0;
            ex_mem_store_data <= 0;
            mem_wb_alu_out <= 0;
            mem_wb_mem_out <= 0;
            mem_wb_rd     <= 0;
            mem_wb_op     <= 0;
            mem_wb_op3    <= 0;
            mem_wb_valid  <= 0;
        end else begin
            // WB stage
            mem_wb_alu_out <= ex_mem_alu_out;
            mem_wb_mem_out <= dmem_rdata;
            mem_wb_rd      <= ex_mem_rd;
            mem_wb_op      <= ex_mem_op;
            mem_wb_op3     <= ex_mem_op3;
            mem_wb_valid   <= ex_mem_valid;

            // EX stage - ALU computed inline
            ex_mem_rd      <= id_ex_rd;
            ex_mem_op      <= id_ex_op;
            ex_mem_op3     <= id_ex_op3;
            ex_mem_store_data <= id_ex_rs2_data;
            ex_mem_valid   <= id_ex_valid;
            if (id_ex_op == 2'b10 || id_ex_op == 2'b11) begin
                if (id_ex_op3 == 6'b000000)
                    ex_mem_alu_out <= id_ex_alu_in1 + id_ex_alu_in2;
                else if (id_ex_op3 == 6'b000100)
                    ex_mem_alu_out <= id_ex_alu_in1 - id_ex_alu_in2;
                else if (id_ex_op3 == 6'b000010)
                    ex_mem_alu_out <= id_ex_alu_in1 | id_ex_alu_in2;
                else if (id_ex_op3 == 6'b000001)
                    ex_mem_alu_out <= id_ex_alu_in1 & id_ex_alu_in2;
                else
                    ex_mem_alu_out <= id_ex_alu_in1 + id_ex_alu_in2;
            end else begin
                ex_mem_alu_out <= 0;
            end

            // ID stage
            id_ex_alu_in1 <= id_alu_in1;
            id_ex_alu_in2 <= id_alu_in2;
            id_ex_rd      <= rd;
            id_ex_op      <= op;
            id_ex_op3     <= op3;
            id_ex_rs2_data <= rs2_data;
            id_ex_valid   <= if_id_valid;

            // IF stage
            if_id_inst    <= imem_data;
            if_id_valid   <= 1;
            pc            <= pc + 4;
        end
    end

    always @(negedge clk) begin
        if (wb_en) begin
            regs[mem_wb_rd] <= wb_data;
        end
    end

endmodule
