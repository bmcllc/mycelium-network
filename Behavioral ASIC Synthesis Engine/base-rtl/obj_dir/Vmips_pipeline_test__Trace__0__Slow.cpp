// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Tracing implementation internals
#include "verilated_vcd_c.h"
#include "Vmips_pipeline_test__Syms.h"


VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_init_sub__TOP__0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd* tracep) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_init_sub__TOP__0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    const int c = vlSymsp->__Vm_baseCode;
    // Body
    tracep->pushPrefix("mips_pipeline_tb", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBit(c+114,0,"clk",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+115,0,"rst",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+46,0,"pc",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+4,0,"v0",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+47,0,"done",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->pushPrefix("dut", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBus(c+117,0,"IMEM_DEPTH",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::PARAMETER, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+117,0,"DMEM_DEPTH",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::PARAMETER, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+114,0,"clk",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+115,0,"rst",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+46,0,"pc_o",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+4,0,"gpr_v0",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+47,0,"done_o",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+48,0,"if_id_pc",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+49,0,"if_id_instr",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+50,0,"if_id_valid",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+51,0,"id_ex_pc",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+52,0,"id_ex_rs_val",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+53,0,"id_ex_rt_val",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+54,0,"id_ex_imm",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+55,0,"id_ex_rs",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+56,0,"id_ex_rt",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+57,0,"id_ex_rd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+58,0,"id_ex_opcode",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+59,0,"id_ex_funct",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+60,0,"id_ex_shamt",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+61,0,"id_ex_reg_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+62,0,"id_ex_mem_read",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+63,0,"id_ex_mem_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+64,0,"id_ex_mem_to_reg",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+65,0,"id_ex_alu_src",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+66,0,"id_ex_alu_op",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->declBit(c+67,0,"id_ex_branch",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+68,0,"id_ex_jal",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+69,0,"id_ex_jr",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+70,0,"id_ex_valid",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+71,0,"ex_mem_alu_result",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+72,0,"ex_mem_rt_val",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+73,0,"ex_mem_rd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+74,0,"ex_mem_opcode",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBit(c+75,0,"ex_mem_reg_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+76,0,"ex_mem_mem_read",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+77,0,"ex_mem_mem_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+78,0,"ex_mem_mem_to_reg",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+79,0,"ex_mem_valid",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+80,0,"mem_wb_write_data",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+81,0,"mem_wb_rd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+82,0,"mem_wb_reg_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+83,0,"mem_wb_valid",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->pushPrefix("gpr", VerilatedTracePrefixType::ARRAY_UNPACKED);
    for (int i = 0; i < 32; ++i) {
        tracep->declBus(c+5+i*1,0,"",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, true,(i+0), 31,0);
    }
    tracep->popPrefix();
    tracep->declBus(c+46,0,"pc",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+40,0,"pc_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+41,0,"if_id_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+42,0,"id_ex_flush",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+43,0,"stall",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+44,0,"id_branch_taken",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+84,0,"id_opcode",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+85,0,"id_rs",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+86,0,"id_rt",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+87,0,"forward_a",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->declBus(c+88,0,"forward_b",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->declBus(c+45,0,"pc_next",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+89,0,"pc_plus4",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+90,0,"branch_target",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+84,0,"opcode",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+85,0,"rs",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+86,0,"rt",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+91,0,"rd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+92,0,"shamt",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+93,0,"funct",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+94,0,"imm16",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 15,0);
    tracep->declBus(c+95,0,"jidx",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 25,0);
    tracep->declBus(c+96,0,"sext_imm",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+37,0,"rs_val",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+38,0,"rt_val",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+39,0,"branch_cond",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+97,0,"id_reg_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+98,0,"id_mem_read",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+99,0,"id_mem_write",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+100,0,"id_mem_to_reg",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+101,0,"id_alu_src",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+102,0,"id_alu_op",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->declBit(c+103,0,"id_branch",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+104,0,"id_jal",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+105,0,"id_jr",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+106,0,"alu_in_a",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+107,0,"alu_in_b",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+108,0,"rt_val_fwd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+109,0,"alu_result",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBit(c+110,0,"alu_zero",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+111,0,"ex_rd",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+71,0,"mem_addr",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+116,0,"mem_read_data",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->declBus(c+112,0,"ex_mem_pc",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::LOGIC, false,-1, 31,0);
    tracep->pushPrefix("forward_unit", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBit(c+114,0,"clk",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+115,0,"rst",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+55,0,"id_ex_rs",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+56,0,"id_ex_rt",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+73,0,"ex_mem_rd",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+75,0,"ex_mem_reg_write",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+81,0,"mem_wb_rd",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+82,0,"mem_wb_reg_write",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+87,0,"forward_a",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->declBus(c+88,0,"forward_b",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 1,0);
    tracep->popPrefix();
    tracep->pushPrefix("hazard_unit", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBit(c+114,0,"clk",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+115,0,"rst",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+84,0,"id_opcode",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+85,0,"id_rs",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBus(c+86,0,"id_rt",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+44,0,"id_branch_taken",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+58,0,"ex_opcode",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 5,0);
    tracep->declBus(c+56,0,"ex_rt",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+62,0,"ex_mem_read",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+57,0,"ex_rd",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+61,0,"ex_reg_write",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBus(c+73,0,"mem_rd",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1, 4,0);
    tracep->declBit(c+75,0,"mem_reg_write",-1, VerilatedTraceSigDirection::INPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+40,0,"pc_write",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+41,0,"if_id_write",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+42,0,"id_ex_flush",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+43,0,"stall",-1, VerilatedTraceSigDirection::OUTPUT, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+113,0,"load_use_hazard",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->declBit(c+44,0,"branch_hazard",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::WIRE, VerilatedTraceSigType::LOGIC, false,-1);
    tracep->popPrefix();
    tracep->pushPrefix("unnamedblk1", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBus(c+1,0,"i",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::INTEGER, false,-1, 31,0);
    tracep->popPrefix();
    tracep->pushPrefix("unnamedblk2", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBus(c+2,0,"i",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::INTEGER, false,-1, 31,0);
    tracep->popPrefix();
    tracep->pushPrefix("unnamedblk3", VerilatedTracePrefixType::SCOPE_MODULE);
    tracep->declBus(c+3,0,"i",-1, VerilatedTraceSigDirection::NONE, VerilatedTraceSigKind::VAR, VerilatedTraceSigType::INTEGER, false,-1, 31,0);
    tracep->popPrefix();
    tracep->popPrefix();
    tracep->popPrefix();
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_init_top(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd* tracep) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_init_top\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    Vmips_pipeline_test___024root__trace_init_sub__TOP__0(vlSelf, tracep);
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_const_0(void* voidSelf, VerilatedVcd::Buffer* bufp);
VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_full_0(void* voidSelf, VerilatedVcd::Buffer* bufp);
void Vmips_pipeline_test___024root__trace_chg_0(void* voidSelf, VerilatedVcd::Buffer* bufp);
void Vmips_pipeline_test___024root__trace_cleanup(void* voidSelf, VerilatedVcd* /*unused*/);

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_register(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd* tracep) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_register\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    tracep->addConstCb(&Vmips_pipeline_test___024root__trace_const_0, 0U, vlSelf);
    tracep->addFullCb(&Vmips_pipeline_test___024root__trace_full_0, 0U, vlSelf);
    tracep->addChgCb(&Vmips_pipeline_test___024root__trace_chg_0, 0U, vlSelf);
    tracep->addCleanupCb(&Vmips_pipeline_test___024root__trace_cleanup, vlSelf);
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_const_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp);

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_const_0(void* voidSelf, VerilatedVcd::Buffer* bufp) {
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_const_0\n"); );
    // Init
    Vmips_pipeline_test___024root* const __restrict vlSelf VL_ATTR_UNUSED = static_cast<Vmips_pipeline_test___024root*>(voidSelf);
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    // Body
    Vmips_pipeline_test___024root__trace_const_0_sub_0((&vlSymsp->TOP), bufp);
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_const_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_const_0_sub_0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    uint32_t* const oldp VL_ATTR_UNUSED = bufp->oldp(vlSymsp->__Vm_baseCode);
    // Body
    bufp->fullIData(oldp+117,(0x100U),32);
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_full_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp);

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_full_0(void* voidSelf, VerilatedVcd::Buffer* bufp) {
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_full_0\n"); );
    // Init
    Vmips_pipeline_test___024root* const __restrict vlSelf VL_ATTR_UNUSED = static_cast<Vmips_pipeline_test___024root*>(voidSelf);
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    // Body
    Vmips_pipeline_test___024root__trace_full_0_sub_0((&vlSymsp->TOP), bufp);
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_full_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_full_0_sub_0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    uint32_t* const oldp VL_ATTR_UNUSED = bufp->oldp(vlSymsp->__Vm_baseCode);
    // Body
    bufp->fullIData(oldp+1,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk1__DOT__i),32);
    bufp->fullIData(oldp+2,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i),32);
    bufp->fullIData(oldp+3,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i),32);
    bufp->fullIData(oldp+4,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                            [2U]),32);
    bufp->fullIData(oldp+5,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0]),32);
    bufp->fullIData(oldp+6,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[1]),32);
    bufp->fullIData(oldp+7,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[2]),32);
    bufp->fullIData(oldp+8,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[3]),32);
    bufp->fullIData(oldp+9,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[4]),32);
    bufp->fullIData(oldp+10,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[5]),32);
    bufp->fullIData(oldp+11,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[6]),32);
    bufp->fullIData(oldp+12,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[7]),32);
    bufp->fullIData(oldp+13,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[8]),32);
    bufp->fullIData(oldp+14,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[9]),32);
    bufp->fullIData(oldp+15,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[10]),32);
    bufp->fullIData(oldp+16,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[11]),32);
    bufp->fullIData(oldp+17,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[12]),32);
    bufp->fullIData(oldp+18,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[13]),32);
    bufp->fullIData(oldp+19,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[14]),32);
    bufp->fullIData(oldp+20,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[15]),32);
    bufp->fullIData(oldp+21,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[16]),32);
    bufp->fullIData(oldp+22,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[17]),32);
    bufp->fullIData(oldp+23,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[18]),32);
    bufp->fullIData(oldp+24,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[19]),32);
    bufp->fullIData(oldp+25,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[20]),32);
    bufp->fullIData(oldp+26,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[21]),32);
    bufp->fullIData(oldp+27,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[22]),32);
    bufp->fullIData(oldp+28,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[23]),32);
    bufp->fullIData(oldp+29,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[24]),32);
    bufp->fullIData(oldp+30,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[25]),32);
    bufp->fullIData(oldp+31,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[26]),32);
    bufp->fullIData(oldp+32,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[27]),32);
    bufp->fullIData(oldp+33,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[28]),32);
    bufp->fullIData(oldp+34,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[29]),32);
    bufp->fullIData(oldp+35,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[30]),32);
    bufp->fullIData(oldp+36,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[31]),32);
    bufp->fullIData(oldp+37,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                             [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                        >> 0x15U))]),32);
    bufp->fullIData(oldp+38,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                             [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                        >> 0x10U))]),32);
    bufp->fullBit(oldp+39,(((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                    >> 0x1aU)) ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                                  [
                                                  (0x1fU 
                                                   & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                      >> 0x15U))] 
                                                  == 
                                                  vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                                  [
                                                  (0x1fU 
                                                   & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                      >> 0x10U))])
                             : ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                        >> 0x1aU)) ? 
                                (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                 [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                            >> 0x15U))] 
                                 != vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                 [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                            >> 0x10U))])
                                 : ((1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                            >> 0x1aU)) 
                                    & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x15U))] 
                                       >> 0x1fU))))));
    bufp->fullBit(oldp+40,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_write));
    bufp->fullBit(oldp+41,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_write));
    bufp->fullBit(oldp+42,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush));
    bufp->fullBit(oldp+43,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__stall));
    bufp->fullBit(oldp+44,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard));
    bufp->fullIData(oldp+45,(((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard)
                               ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
                                  + (((- (IData)((1U 
                                                  & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                     >> 0xfU)))) 
                                      << 0x12U) | (0x3fffcU 
                                                   & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                      << 2U))))
                               : ((IData)(4U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc))),32);
    bufp->fullIData(oldp+46,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc),32);
    bufp->fullBit(oldp+47,(((~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid) 
                                | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid))) 
                            & (0U == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc))));
    bufp->fullIData(oldp+48,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc),32);
    bufp->fullIData(oldp+49,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr),32);
    bufp->fullBit(oldp+50,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid));
    bufp->fullIData(oldp+51,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_pc),32);
    bufp->fullIData(oldp+52,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val),32);
    bufp->fullIData(oldp+53,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val),32);
    bufp->fullIData(oldp+54,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm),32);
    bufp->fullCData(oldp+55,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs),5);
    bufp->fullCData(oldp+56,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt),5);
    bufp->fullCData(oldp+57,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd),5);
    bufp->fullCData(oldp+58,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode),6);
    bufp->fullCData(oldp+59,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct),6);
    bufp->fullCData(oldp+60,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt),5);
    bufp->fullBit(oldp+61,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write));
    bufp->fullBit(oldp+62,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read));
    bufp->fullBit(oldp+63,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write));
    bufp->fullBit(oldp+64,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg));
    bufp->fullBit(oldp+65,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src));
    bufp->fullCData(oldp+66,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op),2);
    bufp->fullBit(oldp+67,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_branch));
    bufp->fullBit(oldp+68,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal));
    bufp->fullBit(oldp+69,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jr));
    bufp->fullBit(oldp+70,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid));
    bufp->fullIData(oldp+71,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result),32);
    bufp->fullIData(oldp+72,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val),32);
    bufp->fullCData(oldp+73,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd),5);
    bufp->fullCData(oldp+74,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode),6);
    bufp->fullBit(oldp+75,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write));
    bufp->fullBit(oldp+76,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_read));
    bufp->fullBit(oldp+77,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write));
    bufp->fullBit(oldp+78,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg));
    bufp->fullBit(oldp+79,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid));
    bufp->fullIData(oldp+80,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data),32);
    bufp->fullCData(oldp+81,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd),5);
    bufp->fullBit(oldp+82,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write));
    bufp->fullBit(oldp+83,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid));
    bufp->fullCData(oldp+84,((vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                              >> 0x1aU)),6);
    bufp->fullCData(oldp+85,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                       >> 0x15U))),5);
    bufp->fullCData(oldp+86,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                       >> 0x10U))),5);
    bufp->fullCData(oldp+87,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a),2);
    bufp->fullCData(oldp+88,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b),2);
    bufp->fullIData(oldp+89,(((IData)(4U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc)),32);
    bufp->fullIData(oldp+90,((vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
                              + (((- (IData)((1U & 
                                              (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                               >> 0xfU)))) 
                                  << 0x12U) | (0x3fffcU 
                                               & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  << 2U))))),32);
    bufp->fullCData(oldp+91,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                       >> 0xbU))),5);
    bufp->fullCData(oldp+92,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                       >> 6U))),5);
    bufp->fullCData(oldp+93,((0x3fU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),6);
    bufp->fullSData(oldp+94,((0xffffU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),16);
    bufp->fullIData(oldp+95,((0x3ffffffU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),26);
    bufp->fullIData(oldp+96,((((- (IData)((1U & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                 >> 0xfU)))) 
                               << 0x10U) | (0xffffU 
                                            & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr))),32);
    bufp->fullBit(oldp+97,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_reg_write));
    bufp->fullBit(oldp+98,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_read));
    bufp->fullBit(oldp+99,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_write));
    bufp->fullBit(oldp+100,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg));
    bufp->fullBit(oldp+101,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_src));
    bufp->fullCData(oldp+102,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_op),2);
    bufp->fullBit(oldp+103,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_branch));
    bufp->fullBit(oldp+104,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jal));
    bufp->fullBit(oldp+105,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jr));
    bufp->fullIData(oldp+106,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a),32);
    bufp->fullIData(oldp+107,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b),32);
    bufp->fullIData(oldp+108,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd),32);
    bufp->fullIData(oldp+109,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result),32);
    bufp->fullBit(oldp+110,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_zero));
    bufp->fullCData(oldp+111,(((0U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode))
                                ? (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd)
                                : ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal)
                                    ? 0x1fU : (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)))),5);
    bufp->fullIData(oldp+112,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc),32);
    bufp->fullBit(oldp+113,(((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read) 
                             & ((0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)) 
                                & (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                    == (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                 >> 0x15U))) 
                                   | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                      == (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                   >> 0x10U))))))));
    bufp->fullBit(oldp+114,(vlSelfRef.mips_pipeline_tb__DOT__clk));
    bufp->fullBit(oldp+115,(vlSelfRef.mips_pipeline_tb__DOT__rst));
    bufp->fullIData(oldp+116,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__dmem
                              [(0xffU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result 
                                         >> 2U))]),32);
}
