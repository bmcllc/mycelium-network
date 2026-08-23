// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Design implementation internals
// See Vmips_pipeline_test.h for the primary calling header

#include "Vmips_pipeline_test__pch.h"
#include "Vmips_pipeline_test___024root.h"

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_static(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_static\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
}

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_initial__TOP(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_initial__TOP\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    vlSelfRef.mips_pipeline_tb__DOT__clk = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[1U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[2U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[3U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[4U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[5U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[6U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[7U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[8U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[9U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xaU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xbU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xcU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xdU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xeU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0xfU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x10U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x11U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x12U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x13U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x14U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x15U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x16U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x17U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x18U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x19U] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1aU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1bU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1cU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1dU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1eU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1fU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk1__DOT__i = 0x20U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i = 0U;
    while (VL_GTS_III(32, 0x100U, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i)) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[(0xffU 
                                                         & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i)] = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i 
            = ((IData)(1U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i);
    }
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i = 0U;
    while (VL_GTS_III(32, 0x100U, vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i)) {
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__dmem[(0xffU 
                                                         & vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i)] = 0U;
        vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i 
            = ((IData)(1U) + vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i);
    }
}

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_final(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_final\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
}

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__stl(Vmips_pipeline_test___024root* vlSelf);
#endif  // VL_DEBUG
VL_ATTR_COLD bool Vmips_pipeline_test___024root___eval_phase__stl(Vmips_pipeline_test___024root* vlSelf);

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_settle(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_settle\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    IData/*31:0*/ __VstlIterCount;
    CData/*0:0*/ __VstlContinue;
    // Body
    __VstlIterCount = 0U;
    vlSelfRef.__VstlFirstIteration = 1U;
    __VstlContinue = 1U;
    while (__VstlContinue) {
        if (VL_UNLIKELY((0x64U < __VstlIterCount))) {
#ifdef VL_DEBUG
            Vmips_pipeline_test___024root___dump_triggers__stl(vlSelf);
#endif
            VL_FATAL_MT("tests/mips_pipeline_test.v", 4, "", "Settle region did not converge.");
        }
        __VstlIterCount = ((IData)(1U) + __VstlIterCount);
        __VstlContinue = 0U;
        if (Vmips_pipeline_test___024root___eval_phase__stl(vlSelf)) {
            __VstlContinue = 1U;
        }
        vlSelfRef.__VstlFirstIteration = 0U;
    }
}

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__stl(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___dump_triggers__stl\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1U & (~ vlSelfRef.__VstlTriggered.any()))) {
        VL_DBG_MSGF("         No triggers active\n");
    }
    if ((1ULL & vlSelfRef.__VstlTriggered.word(0U))) {
        VL_DBG_MSGF("         'stl' region trigger index 0 is active: Internal 'stl' trigger - first iteration\n");
    }
}
#endif  // VL_DEBUG

VL_ATTR_COLD void Vmips_pipeline_test___024root___stl_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf);
VL_ATTR_COLD void Vmips_pipeline_test___024root____Vm_traceActivitySetAll(Vmips_pipeline_test___024root* vlSelf);

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_stl(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_stl\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1ULL & vlSelfRef.__VstlTriggered.word(0U))) {
        Vmips_pipeline_test___024root___stl_sequent__TOP__0(vlSelf);
        Vmips_pipeline_test___024root____Vm_traceActivitySetAll(vlSelf);
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
extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_hd49f5251_0;
extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_hd47733a5_0;
extern const VlUnpacked<CData/*0:0*/, 4> Vmips_pipeline_test__ConstPool__TABLE_h6e5cdc5e_0;

VL_ATTR_COLD void Vmips_pipeline_test___024root___stl_sequent__TOP__0(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___stl_sequent__TOP__0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    SData/*8:0*/ __Vtableidx1;
    __Vtableidx1 = 0;
    CData/*1:0*/ __Vtableidx2;
    __Vtableidx2 = 0;
    // Body
    vlSelfRef.mips_pipeline_tb__DOT__v0 = vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr
        [2U];
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
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__alu_in_a 
        = ((2U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a))
            ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result
            : ((1U == (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__forward_a))
                ? vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data
                : vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val));
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
}

VL_ATTR_COLD void Vmips_pipeline_test___024root___eval_triggers__stl(Vmips_pipeline_test___024root* vlSelf);

VL_ATTR_COLD bool Vmips_pipeline_test___024root___eval_phase__stl(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_phase__stl\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    CData/*0:0*/ __VstlExecute;
    // Body
    Vmips_pipeline_test___024root___eval_triggers__stl(vlSelf);
    __VstlExecute = vlSelfRef.__VstlTriggered.any();
    if (__VstlExecute) {
        Vmips_pipeline_test___024root___eval_stl(vlSelf);
    }
    return (__VstlExecute);
}

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__act(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___dump_triggers__act\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1U & (~ vlSelfRef.__VactTriggered.any()))) {
        VL_DBG_MSGF("         No triggers active\n");
    }
    if ((1ULL & vlSelfRef.__VactTriggered.word(0U))) {
        VL_DBG_MSGF("         'act' region trigger index 0 is active: @(posedge mips_pipeline_tb.clk)\n");
    }
    if ((2ULL & vlSelfRef.__VactTriggered.word(0U))) {
        VL_DBG_MSGF("         'act' region trigger index 1 is active: @([true] __VdlySched.awaitingCurrentTime())\n");
    }
}
#endif  // VL_DEBUG

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__nba(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___dump_triggers__nba\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    if ((1U & (~ vlSelfRef.__VnbaTriggered.any()))) {
        VL_DBG_MSGF("         No triggers active\n");
    }
    if ((1ULL & vlSelfRef.__VnbaTriggered.word(0U))) {
        VL_DBG_MSGF("         'nba' region trigger index 0 is active: @(posedge mips_pipeline_tb.clk)\n");
    }
    if ((2ULL & vlSelfRef.__VnbaTriggered.word(0U))) {
        VL_DBG_MSGF("         'nba' region trigger index 1 is active: @([true] __VdlySched.awaitingCurrentTime())\n");
    }
}
#endif  // VL_DEBUG

VL_ATTR_COLD void Vmips_pipeline_test___024root____Vm_traceActivitySetAll(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root____Vm_traceActivitySetAll\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    vlSelfRef.__Vm_traceActivity[0U] = 1U;
    vlSelfRef.__Vm_traceActivity[1U] = 1U;
    vlSelfRef.__Vm_traceActivity[2U] = 1U;
    vlSelfRef.__Vm_traceActivity[3U] = 1U;
    vlSelfRef.__Vm_traceActivity[4U] = 1U;
}

VL_ATTR_COLD void Vmips_pipeline_test___024root___ctor_var_reset(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___ctor_var_reset\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    vlSelf->mips_pipeline_tb__DOT__clk = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__rst = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__v0 = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__if_id_pc = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__if_id_instr = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__if_id_valid = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_pc = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_imm = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_rs = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_rt = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_rd = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode = VL_RAND_RESET_I(6);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_funct = VL_RAND_RESET_I(6);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op = VL_RAND_RESET_I(2);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_branch = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_jal = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_jr = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_valid = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode = VL_RAND_RESET_I(6);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_read = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd = VL_RAND_RESET_I(5);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid = VL_RAND_RESET_I(1);
    for (int __Vi0 = 0; __Vi0 < 32; ++__Vi0) {
        vlSelf->mips_pipeline_tb__DOT__dut__DOT__gpr[__Vi0] = VL_RAND_RESET_I(32);
    }
    for (int __Vi0 = 0; __Vi0 < 256; ++__Vi0) {
        vlSelf->mips_pipeline_tb__DOT__dut__DOT__imem[__Vi0] = VL_RAND_RESET_I(32);
    }
    for (int __Vi0 = 0; __Vi0 < 256; ++__Vi0) {
        vlSelf->mips_pipeline_tb__DOT__dut__DOT__dmem[__Vi0] = VL_RAND_RESET_I(32);
    }
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__pc = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__pc_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__if_id_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_ex_flush = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__stall = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__forward_a = VL_RAND_RESET_I(2);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__forward_b = VL_RAND_RESET_I(2);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__pc_next = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_reg_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_mem_read = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_mem_write = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_alu_src = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_alu_op = VL_RAND_RESET_I(2);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_branch = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_jal = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__id_jr = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__alu_in_a = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__alu_in_b = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__alu_result = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__alu_zero = VL_RAND_RESET_I(1);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__unnamedblk1__DOT__i = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i = VL_RAND_RESET_I(32);
    vlSelf->mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard = VL_RAND_RESET_I(1);
    vlSelf->__Vtrigprevexpr___TOP__mips_pipeline_tb__DOT__clk__0 = VL_RAND_RESET_I(1);
    for (int __Vi0 = 0; __Vi0 < 5; ++__Vi0) {
        vlSelf->__Vm_traceActivity[__Vi0] = 0;
    }
}
