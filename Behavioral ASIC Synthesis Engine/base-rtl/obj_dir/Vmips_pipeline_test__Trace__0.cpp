// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Tracing implementation internals
#include "verilated_vcd_c.h"
#include "Vmips_pipeline_test__Syms.h"


void Vmips_pipeline_test___024root__trace_chg_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp);

void Vmips_pipeline_test___024root__trace_chg_0(void* voidSelf, VerilatedVcd::Buffer* bufp) {
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_chg_0\n"); );
    // Init
    Vmips_pipeline_test___024root* const __restrict vlSelf VL_ATTR_UNUSED = static_cast<Vmips_pipeline_test___024root*>(voidSelf);
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    if (VL_UNLIKELY(!vlSymsp->__Vm_activity)) return;
    // Body
    Vmips_pipeline_test___024root__trace_chg_0_sub_0((&vlSymsp->TOP), bufp);
}

void Vmips_pipeline_test___024root__trace_chg_0_sub_0(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd::Buffer* bufp) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_chg_0_sub_0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    uint32_t* const oldp VL_ATTR_UNUSED = bufp->oldp(vlSymsp->__Vm_baseCode + 1);
    // Body
    if (VL_UNLIKELY(vlSelfRef.__Vm_traceActivity[1U])) {
        bufp->chgIData(oldp+0,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk1__DOT__i),32);
        bufp->chgIData(oldp+1,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i),32);
        bufp->chgIData(oldp+2,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i),32);
    }
    if (VL_UNLIKELY(((vlSelfRef.__Vm_traceActivity[1U] 
                      | vlSelfRef.__Vm_traceActivity
                      [2U]) | vlSelfRef.__Vm_traceActivity
                     [4U]))) {
        bufp->chgIData(oldp+3,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                               [2U]),32);
        bufp->chgIData(oldp+4,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0]),32);
        bufp->chgIData(oldp+5,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[1]),32);
        bufp->chgIData(oldp+6,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[2]),32);
        bufp->chgIData(oldp+7,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[3]),32);
        bufp->chgIData(oldp+8,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[4]),32);
        bufp->chgIData(oldp+9,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[5]),32);
        bufp->chgIData(oldp+10,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[6]),32);
        bufp->chgIData(oldp+11,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[7]),32);
        bufp->chgIData(oldp+12,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[8]),32);
        bufp->chgIData(oldp+13,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[9]),32);
        bufp->chgIData(oldp+14,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[10]),32);
        bufp->chgIData(oldp+15,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[11]),32);
        bufp->chgIData(oldp+16,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[12]),32);
        bufp->chgIData(oldp+17,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[13]),32);
        bufp->chgIData(oldp+18,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[14]),32);
        bufp->chgIData(oldp+19,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[15]),32);
        bufp->chgIData(oldp+20,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[16]),32);
        bufp->chgIData(oldp+21,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[17]),32);
        bufp->chgIData(oldp+22,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[18]),32);
        bufp->chgIData(oldp+23,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[19]),32);
        bufp->chgIData(oldp+24,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[20]),32);
        bufp->chgIData(oldp+25,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[21]),32);
        bufp->chgIData(oldp+26,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[22]),32);
        bufp->chgIData(oldp+27,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[23]),32);
        bufp->chgIData(oldp+28,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[24]),32);
        bufp->chgIData(oldp+29,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[25]),32);
        bufp->chgIData(oldp+30,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[26]),32);
        bufp->chgIData(oldp+31,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[27]),32);
        bufp->chgIData(oldp+32,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[28]),32);
        bufp->chgIData(oldp+33,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[29]),32);
        bufp->chgIData(oldp+34,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[30]),32);
        bufp->chgIData(oldp+35,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[31]),32);
        bufp->chgIData(oldp+36,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                           >> 0x15U))]),32);
        bufp->chgIData(oldp+37,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                           >> 0x10U))]),32);
        bufp->chgBit(oldp+38,(((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                       >> 0x1aU)) ? 
                               (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                           >> 0x15U))] 
                                == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                           >> 0x10U))])
                                : ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                           >> 0x1aU))
                                    ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x15U))] 
                                       != vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x10U))])
                                    : ((1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                               >> 0x1aU)) 
                                       & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                          [(0x1fU & 
                                            (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x15U))] 
                                          >> 0x1fU))))));
    }
    if (VL_UNLIKELY((vlSelfRef.__Vm_traceActivity[3U] 
                     | vlSelfRef.__Vm_traceActivity
                     [4U]))) {
        bufp->chgBit(oldp+39,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_write));
        bufp->chgBit(oldp+40,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_write));
        bufp->chgBit(oldp+41,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush));
        bufp->chgBit(oldp+42,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__stall));
        bufp->chgBit(oldp+43,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard));
        bufp->chgIData(oldp+44,(((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard)
                                  ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
                                     + (((- (IData)(
                                                    (1U 
                                                     & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                        >> 0xfU)))) 
                                         << 0x12U) 
                                        | (0x3fffcU 
                                           & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                              << 2U))))
                                  : ((IData)(4U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc))),32);
    }
    if (VL_UNLIKELY(vlSelfRef.__Vm_traceActivity[4U])) {
        bufp->chgIData(oldp+45,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc),32);
        bufp->chgBit(oldp+46,(((~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid) 
                                   | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid))) 
                               & (0U == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc))));
        bufp->chgIData(oldp+47,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc),32);
        bufp->chgIData(oldp+48,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr),32);
        bufp->chgBit(oldp+49,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid));
        bufp->chgIData(oldp+50,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_pc),32);
        bufp->chgIData(oldp+51,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val),32);
        bufp->chgIData(oldp+52,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val),32);
        bufp->chgIData(oldp+53,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm),32);
        bufp->chgCData(oldp+54,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs),5);
        bufp->chgCData(oldp+55,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt),5);
        bufp->chgCData(oldp+56,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd),5);
        bufp->chgCData(oldp+57,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode),6);
        bufp->chgCData(oldp+58,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct),6);
        bufp->chgCData(oldp+59,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt),5);
        bufp->chgBit(oldp+60,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write));
        bufp->chgBit(oldp+61,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read));
        bufp->chgBit(oldp+62,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write));
        bufp->chgBit(oldp+63,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg));
        bufp->chgBit(oldp+64,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src));
        bufp->chgCData(oldp+65,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op),2);
        bufp->chgBit(oldp+66,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_branch));
        bufp->chgBit(oldp+67,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal));
        bufp->chgBit(oldp+68,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jr));
        bufp->chgBit(oldp+69,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid));
        bufp->chgIData(oldp+70,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result),32);
        bufp->chgIData(oldp+71,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val),32);
        bufp->chgCData(oldp+72,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd),5);
        bufp->chgCData(oldp+73,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode),6);
        bufp->chgBit(oldp+74,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write));
        bufp->chgBit(oldp+75,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_read));
        bufp->chgBit(oldp+76,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write));
        bufp->chgBit(oldp+77,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg));
        bufp->chgBit(oldp+78,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid));
        bufp->chgIData(oldp+79,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data),32);
        bufp->chgCData(oldp+80,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd),5);
        bufp->chgBit(oldp+81,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write));
        bufp->chgBit(oldp+82,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid));
        bufp->chgCData(oldp+83,((vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                 >> 0x1aU)),6);
        bufp->chgCData(oldp+84,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                          >> 0x15U))),5);
        bufp->chgCData(oldp+85,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                          >> 0x10U))),5);
        bufp->chgCData(oldp+86,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a),2);
        bufp->chgCData(oldp+87,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b),2);
        bufp->chgIData(oldp+88,(((IData)(4U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc)),32);
        bufp->chgIData(oldp+89,((vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
                                 + (((- (IData)((1U 
                                                 & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                    >> 0xfU)))) 
                                     << 0x12U) | (0x3fffcU 
                                                  & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                     << 2U))))),32);
        bufp->chgCData(oldp+90,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                          >> 0xbU))),5);
        bufp->chgCData(oldp+91,((0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                          >> 6U))),5);
        bufp->chgCData(oldp+92,((0x3fU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),6);
        bufp->chgSData(oldp+93,((0xffffU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),16);
        bufp->chgIData(oldp+94,((0x3ffffffU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)),26);
        bufp->chgIData(oldp+95,((((- (IData)((1U & 
                                              (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                               >> 0xfU)))) 
                                  << 0x10U) | (0xffffU 
                                               & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr))),32);
        bufp->chgBit(oldp+96,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_reg_write));
        bufp->chgBit(oldp+97,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_read));
        bufp->chgBit(oldp+98,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_write));
        bufp->chgBit(oldp+99,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg));
        bufp->chgBit(oldp+100,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_src));
        bufp->chgCData(oldp+101,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_op),2);
        bufp->chgBit(oldp+102,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_branch));
        bufp->chgBit(oldp+103,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jal));
        bufp->chgBit(oldp+104,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jr));
        bufp->chgIData(oldp+105,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a),32);
        bufp->chgIData(oldp+106,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b),32);
        bufp->chgIData(oldp+107,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd),32);
        bufp->chgIData(oldp+108,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result),32);
        bufp->chgBit(oldp+109,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_zero));
        bufp->chgCData(oldp+110,(((0U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode))
                                   ? (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd)
                                   : ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal)
                                       ? 0x1fU : (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)))),5);
        bufp->chgIData(oldp+111,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc),32);
        bufp->chgBit(oldp+112,(((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read) 
                                & ((0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)) 
                                   & (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                       == (0x1fU & 
                                           (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                            >> 0x15U))) 
                                      | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                         == (0x1fU 
                                             & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                >> 0x10U))))))));
    }
    bufp->chgBit(oldp+113,(vlSelfRef.mips_pipeline_tb__DOT__clk));
    bufp->chgBit(oldp+114,(vlSelfRef.mips_pipeline_tb__DOT__rst));
    bufp->chgIData(oldp+115,(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__dmem
                             [(0xffU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result 
                                        >> 2U))]),32);
}

void Vmips_pipeline_test___024root__trace_cleanup(void* voidSelf, VerilatedVcd* /*unused*/) {
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root__trace_cleanup\n"); );
    // Init
    Vmips_pipeline_test___024root* const __restrict vlSelf VL_ATTR_UNUSED = static_cast<Vmips_pipeline_test___024root*>(voidSelf);
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    // Body
    vlSymsp->__Vm_activity = false;
    vlSymsp->TOP.__Vm_traceActivity[0U] = 0U;
    vlSymsp->TOP.__Vm_traceActivity[1U] = 0U;
    vlSymsp->TOP.__Vm_traceActivity[2U] = 0U;
    vlSymsp->TOP.__Vm_traceActivity[3U] = 0U;
    vlSymsp->TOP.__Vm_traceActivity[4U] = 0U;
}
