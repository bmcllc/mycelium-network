// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Design implementation internals
// See Vmips_pipeline_test.h for the primary calling header

#include "Vmips_pipeline_test__pch.h"
#include "Vmips_pipeline_test___024root.h"

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_initial__TOP(Vmips_pipeline_test___024root* vlSelf);
VlCoroutine Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__0(Vmips_pipeline_test___024root* vlSelf);
VlCoroutine Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__1(Vmips_pipeline_test___024root* vlSelf);

void Vmips_pipeline_test___024root___eval_initial(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_initial\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    Vmips_pipeline_test___024root___eval_initial__TOP(vlSelf);
    vlSelfRef.__Vm_traceActivity[1U] = 1U;
    Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__0(vlSelf);
    Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__1(vlSelf);
    vlSelfRef.__Vtrigprevexpr___TOP__mips_pipeline_tb__DOT__clk__0 
        = vlSelfRef.mips_pipeline_tb__DOT__clk;
}

VL_INLINE_OPT VlCoroutine Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__1(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__1\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    while (1U) {
        co_await vlSelfRef.__VdlySched.delay(5ULL, 
                                             nullptr, 
                                             "tests/mips_pipeline_test.v", 
                                             27);
        vlSelfRef.mips_pipeline_tb__DOT__clk = (1U 
                                                & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__clk)));
    }
}

void Vmips_pipeline_test___024root___act_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf);

void Vmips_pipeline_test___024root___eval_act(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_act\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1ULL & vlSelfRef.__VactTriggered.word(0U))) {
        Vmips_pipeline_test___024root___act_sequent__TOP__0(vlSelf);
        vlSelfRef.__Vm_traceActivity[3U] = 1U;
    }
}

extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_hd49f5251_0;
extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_hd47733a5_0;
extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0;

VL_INLINE_OPT void Vmips_pipeline_test___024root___act_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___act_sequent__TOP__0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    CData/*1:0*/ __Vtableidx2;
    __Vtableidx2 = 0;
    // Body
    vlSelfRef.mips_pipeline_tb__DOT__v0 = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
        [2U];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid) 
           & (((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                       >> 0x1aU)) | ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x1aU)) 
                                     | (1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                               >> 0x1aU)))) 
              & ((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                         >> 0x1aU)) ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x15U))] 
                                       == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x10U))])
                  : ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                             >> 0x1aU)) ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                           [(0x1fU 
                                             & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                >> 0x15U))] 
                                           != vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                           [(0x1fU 
                                             & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                >> 0x10U))])
                      : ((1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                 >> 0x1aU)) & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                               [(0x1fU 
                                                 & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                    >> 0x15U))] 
                                               >> 0x1fU))))));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_next 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard)
            ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
               + (((- (IData)((1U & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                     >> 0xfU)))) << 0x12U) 
                  | (0x3fffcU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                 << 2U)))) : ((IData)(4U) 
                                              + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc));
    __Vtableidx2 = (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard) 
                     << 1U) | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read) 
                               & ((0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)) 
                                  & (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                      == (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                   >> 0x15U))) 
                                     | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                        == (0x1fU & 
                                            (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x10U)))))));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_write 
        = Vmips_pipeline_test__ConstPool__TABLE_hd49f5251_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_write 
        = Vmips_pipeline_test__ConstPool__TABLE_hd47733a5_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush 
        = Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__stall 
        = Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0
        [__Vtableidx2];
}

void Vmips_pipeline_test___024root___nba_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf);

void Vmips_pipeline_test___024root___eval_nba(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_nba\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1ULL & vlSelfRef.__VnbaTriggered.word(0U))) {
        Vmips_pipeline_test___024root___nba_sequent__TOP__0(vlSelf);
        vlSelfRef.__Vm_traceActivity[4U] = 1U;
    }
}

extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_hb44f142f_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h9d4459f2_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h95b82bdb_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h00176ed5_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h7808eb2d_0;
extern const VlUnpacked<CData/*1:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h814e1a5d_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_hc3c44019_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_ha3a3680d_0;
extern const VlUnpacked<CData/*0:0*/, 512> Vmips_pipeline_test__ConstPool__TABLE_h3f68b385_0;

VL_INLINE_OPT void Vmips_pipeline_test___024root___nba_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___nba_sequent__TOP__0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    SData/*8:0*/ __Vtableidx1;
    __Vtableidx1 = 0;
    CData/*1:0*/ __Vtableidx2;
    __Vtableidx2 = 0;
    IData/*31:0*/ __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__dmem__v0;
    __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 = 0;
    CData/*7:0*/ __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__dmem__v0;
    __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 = 0;
    CData/*0:0*/ __VdlySet__mips_pipeline_tb__DOT__dut__DOT__dmem__v0;
    __VdlySet__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 = 0;
    IData/*31:0*/ __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__gpr__v0;
    __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 = 0;
    CData/*4:0*/ __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__gpr__v0;
    __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 = 0;
    CData/*0:0*/ __VdlySet__mips_pipeline_tb__DOT__dut__DOT__gpr__v0;
    __VdlySet__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 = 0;
    // Body
    __VdlySet__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 = 0U;
    __VdlySet__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 = 0U;
    if (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write) 
         & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid))) {
        __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val;
        __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 
            = (0xffU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result 
                        >> 2U));
        __VdlySet__mips_pipeline_tb__DOT__dut__DOT__dmem__v0 = 1U;
    }
    if ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write) 
          & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid)) 
         & (0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd)))) {
        __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data;
        __VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd;
        __VdlySet__mips_pipeline_tb__DOT__dut__DOT__gpr__v0 = 1U;
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_branch 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_branch));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jr 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jr));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_src));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_read 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read) 
               & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid)));
    if (((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
         | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val = 0U;
    } else {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_op;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt 
            = (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                        >> 6U));
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct 
            = (0x3fU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr);
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs 
            = (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                        >> 0x15U));
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm 
            = (((- (IData)((1U & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                  >> 0xfU)))) << 0x10U) 
               | (0xffffU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr));
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
            [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                       >> 0x15U))];
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
            [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                       >> 0x10U))];
    }
    if (__VdlySet__mips_pipeline_tb__DOT__dut__DOT__gpr__v0) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[__VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__gpr__v0] 
            = __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__gpr__v0;
    }
    if (vlSelfRef.mips_pipeline_tb__DOT__rst) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd = 0U;
    } else {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data 
            = ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid) 
                 & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg)) 
                & (3U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode)))
                ? ((IData)(4U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc)
                : ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg)
                    ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__dmem
                   [(0xffU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result 
                              >> 2U))] : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result));
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd 
            = ((0U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode))
                ? (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd)
                : ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal)
                    ? 0x1fU : (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)));
    }
    if (((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
         | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt = 0U;
    } else {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rd 
            = (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                        >> 0xbU));
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt 
            = (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                        >> 0x10U));
    }
    if (vlSelfRef.mips_pipeline_tb__DOT__rst) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc = 0U;
    } else {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc 
            = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_pc;
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_pc 
        = (((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
            | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush))
            ? 0U : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc);
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst)
            ? 0U : (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode 
        = (((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
            | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush))
            ? 0U : (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                    >> 0x1aU));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write) 
               & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid)));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write) 
               & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid)));
    vlSelfRef.mips_pipeline_tb__DOT__v0 = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
        [2U];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_read));
    if (__VdlySet__mips_pipeline_tb__DOT__dut__DOT__dmem__v0) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__dmem[__VdlyDim0__mips_pipeline_tb__DOT__dut__DOT__dmem__v0] 
            = __VdlyVal__mips_pipeline_tb__DOT__dut__DOT__dmem__v0;
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_write));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write) 
               & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid)));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg 
        = ((1U & (~ (IData)(vlSelfRef.mips_pipeline_tb__DOT__rst))) 
           && ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg) 
               & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid)));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_reg_write));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a = 0U;
    if ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write) 
          & (0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd))) 
         & ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd) 
            == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs)))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a = 2U;
    } else if ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write) 
                 & (0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd))) 
                & ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd) 
                   == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs)))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a = 1U;
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_jal 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jal));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid 
        = ((1U & (~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__rst) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush)))) 
           && (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid));
    if (vlSelfRef.mips_pipeline_tb__DOT__rst) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc = 0U;
    } else {
        if (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_write) {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
                = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc;
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem
                [(0xffU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc 
                           >> 2U))];
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid = 1U;
        } else if (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush) {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid = 0U;
        }
        if (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_write) {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc 
                = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_next;
        }
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
        = ((2U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a))
            ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result
            : ((1U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a))
                ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data
                : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b = 0U;
    if ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write) 
          & (0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd))) 
         & ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd) 
            == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b = 2U;
    } else if ((((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write) 
                 & (0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd))) 
                & ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd) 
                   == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)))) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b = 1U;
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd 
        = ((2U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b))
            ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result
            : ((1U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_b))
                ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data
                : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src)
            ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm
            : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd);
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid) 
           & (((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                       >> 0x1aU)) | ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x1aU)) 
                                     | (1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                               >> 0x1aU)))) 
              & ((4U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                         >> 0x1aU)) ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x15U))] 
                                       == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                       [(0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                  >> 0x10U))])
                  : ((5U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                             >> 0x1aU)) ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                           [(0x1fU 
                                             & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                >> 0x15U))] 
                                           != vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                           [(0x1fU 
                                             & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                >> 0x10U))])
                      : ((1U == (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                 >> 0x1aU)) & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
                                               [(0x1fU 
                                                 & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                    >> 0x15U))] 
                                               >> 0x1fU))))));
    __Vtableidx1 = ((((9U == (0x3fU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)) 
                      << 8U) | ((8U == (0x3fU & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr)) 
                                << 7U)) | ((0x7eU & 
                                            (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x19U)) 
                                           | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid)));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_reg_write 
        = Vmips_pipeline_test__ConstPool__TABLE_hb44f142f_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_read 
        = Vmips_pipeline_test__ConstPool__TABLE_h9d4459f2_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_write 
        = Vmips_pipeline_test__ConstPool__TABLE_h95b82bdb_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg 
        = Vmips_pipeline_test__ConstPool__TABLE_h00176ed5_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_src 
        = Vmips_pipeline_test__ConstPool__TABLE_h7808eb2d_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_alu_op 
        = Vmips_pipeline_test__ConstPool__TABLE_h814e1a5d_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_branch 
        = Vmips_pipeline_test__ConstPool__TABLE_hc3c44019_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jal 
        = Vmips_pipeline_test__ConstPool__TABLE_ha3a3680d_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_jr 
        = Vmips_pipeline_test__ConstPool__TABLE_h3f68b385_0
        [__Vtableidx1];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_zero = 0U;
    if (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid) {
        if ((2U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op))) {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result 
                = ((1U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op))
                    ? VL_LTS_III(32, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b)
                    : ((0x20U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                        ? ((0x10U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                            ? 0U : ((8U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                     ? ((4U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                         ? 0U : ((2U 
                                                  & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                  ? 
                                                 ((1U 
                                                   & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                   ? 0U
                                                   : 
                                                  VL_LTS_III(32, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b))
                                                  : 0U))
                                     : ((4U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                         ? ((2U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                             ? ((1U 
                                                 & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                 ? 
                                                (~ 
                                                 (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                                                  | vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b))
                                                 : 0U)
                                             : ((1U 
                                                 & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                 ? 
                                                (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                                                 | vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b)
                                                 : 
                                                (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                                                 & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b)))
                                         : ((2U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                             ? ((1U 
                                                 & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                 ? 
                                                (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                                                 - vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b)
                                                 : 0U)
                                             : ((1U 
                                                 & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                 ? 
                                                (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                                                 + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b)
                                                 : 0U)))))
                        : ((0x10U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                            ? 0U : ((8U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                     ? 0U : ((4U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                              ? 0U : 
                                             ((2U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                               ? ((1U 
                                                   & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                   ? 0U
                                                   : 
                                                  (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b 
                                                   >> (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt)))
                                               : ((1U 
                                                   & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_funct))
                                                   ? 0U
                                                   : 
                                                  (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b 
                                                   << (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt)))))))));
        } else if ((1U & (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op))) {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result 
                = (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                   - vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b);
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_zero 
                = (0U == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result);
        } else {
            vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_result 
                = ((0xfU == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode))
                    ? VL_SHIFTL_III(32,32,32, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_imm, 0x10U)
                    : (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
                       + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_b));
        }
    }
    __Vtableidx2 = (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard) 
                     << 1U) | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read) 
                               & ((0U != (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt)) 
                                  & (((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                      == (0x1fU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                                   >> 0x15U))) 
                                     | ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rt) 
                                        == (0x1fU & 
                                            (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                             >> 0x10U)))))));
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_write 
        = Vmips_pipeline_test__ConstPool__TABLE_hd49f5251_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_write 
        = Vmips_pipeline_test__ConstPool__TABLE_hd47733a5_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_flush 
        = Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__stall 
        = Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0
        [__Vtableidx2];
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc_next 
        = ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard)
            ? (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_pc 
               + (((- (IData)((1U & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                     >> 0xfU)))) << 0x12U) 
                  | (0x3fffcU & (vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_instr 
                                 << 2U)))) : ((IData)(4U) 
                                              + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc));
}

void Vmips_pipeline_test___024root___timing_resume(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___timing_resume\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1ULL & vlSelfRef.__VactTriggered.word(0U))) {
        vlSelfRef.__VtrigSched_hfc2f64f2__0.resume(
                                                   "@(posedge mips_pipeline_tb.clk)");
    }
    if ((2ULL & vlSelfRef.__VactTriggered.word(0U))) {
        vlSelfRef.__VdlySched.resume();
    }
}

void Vmips_pipeline_test___024root___timing_commit(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___timing_commit\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((! (1ULL & vlSelfRef.__VactTriggered.word(0U)))) {
        vlSelfRef.__VtrigSched_hfc2f64f2__0.commit(
                                                   "@(posedge mips_pipeline_tb.clk)");
    }
}

void Vmips_pipeline_test___024root___eval_triggers__act(Vmips_pipeline_test___024root* vlSelf);

bool Vmips_pipeline_test___024root___eval_phase__act(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_phase__act\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    VlTriggerVec<2> __VpreTriggered;
    CData/*0:0*/ __VactExecute;
    // Body
    Vmips_pipeline_test___024root___eval_triggers__act(vlSelf);
    Vmips_pipeline_test___024root___timing_commit(vlSelf);
    __VactExecute = vlSelfRef.__VactTriggered.any();
    if (__VactExecute) {
        __VpreTriggered.andNot(vlSelfRef.__VactTriggered, vlSelfRef.__VnbaTriggered);
        vlSelfRef.__VnbaTriggered.thisOr(vlSelfRef.__VactTriggered);
        Vmips_pipeline_test___024root___timing_resume(vlSelf);
        Vmips_pipeline_test___024root___eval_act(vlSelf);
    }
    return (__VactExecute);
}

bool Vmips_pipeline_test___024root___eval_phase__nba(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_phase__nba\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    CData/*0:0*/ __VnbaExecute;
    // Body
    __VnbaExecute = vlSelfRef.__VnbaTriggered.any();
    if (__VnbaExecute) {
        Vmips_pipeline_test___024root___eval_nba(vlSelf);
        vlSelfRef.__VnbaTriggered.clear();
    }
    return (__VnbaExecute);
}

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__nba(Vmips_pipeline_test___024root* vlSelf);
#endif  // VL_DEBUG
#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__act(Vmips_pipeline_test___024root* vlSelf);
#endif  // VL_DEBUG

void Vmips_pipeline_test___024root___eval(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    IData/*31:0*/ __VnbaIterCount;
    CData/*0:0*/ __VnbaContinue;
    // Body
    __VnbaIterCount = 0U;
    __VnbaContinue = 1U;
    while (__VnbaContinue) {
        if (VL_UNLIKELY((0x64U < __VnbaIterCount))) {
#ifdef VL_DEBUG
            Vmips_pipeline_test___024root___dump_triggers__nba(vlSelf);
#endif
            VL_FATAL_MT("tests/mips_pipeline_test.v", 4, "", "NBA region did not converge.");
        }
        __VnbaIterCount = ((IData)(1U) + __VnbaIterCount);
        __VnbaContinue = 0U;
        vlSelfRef.__VactIterCount = 0U;
        vlSelfRef.__VactContinue = 1U;
        while (vlSelfRef.__VactContinue) {
            if (VL_UNLIKELY((0x64U < vlSelfRef.__VactIterCount))) {
#ifdef VL_DEBUG
                Vmips_pipeline_test___024root___dump_triggers__act(vlSelf);
#endif
                VL_FATAL_MT("tests/mips_pipeline_test.v", 4, "", "Active region did not converge.");
            }
            vlSelfRef.__VactIterCount = ((IData)(1U) 
                                         + vlSelfRef.__VactIterCount);
            vlSelfRef.__VactContinue = 0U;
            if (Vmips_pipeline_test___024root___eval_phase__act(vlSelf)) {
                vlSelfRef.__VactContinue = 1U;
            }
        }
        if (Vmips_pipeline_test___024root___eval_phase__nba(vlSelf)) {
            __VnbaContinue = 1U;
        }
    }
}

#ifdef VL_DEBUG
void Vmips_pipeline_test___024root___eval_debug_assertions(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_debug_assertions\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
}
#endif  // VL_DEBUG
