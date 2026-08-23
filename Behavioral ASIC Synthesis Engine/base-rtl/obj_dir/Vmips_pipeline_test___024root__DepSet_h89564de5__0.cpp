// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Design implementation internals
// See Vmips_pipeline_test.h for the primary calling header

#include "Vmips_pipeline_test__pch.h"
#include "Vmips_pipeline_test__Syms.h"
#include "Vmips_pipeline_test___024root.h"

VL_INLINE_OPT VlCoroutine Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__0(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_initial__TOP__Vtiming__0\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Init
    IData/*31:0*/ mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1;
    mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1 = 0;
    VlWide<5>/*159:0*/ __Vtemp_1;
    // Body
    __Vtemp_1[0U] = 0x2e766364U;
    __Vtemp_1[1U] = 0x6c696e65U;
    __Vtemp_1[2U] = 0x70697065U;
    __Vtemp_1[3U] = 0x6970735fU;
    __Vtemp_1[4U] = 0x6dU;
    vlSymsp->_vm_contextp__->dumpfile(VL_CVT_PACK_STR_NW(5, __Vtemp_1));
    vlSymsp->_traceDumpOpen();
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0U] = 0x2404000aU;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[1U] = 0x24020000U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[2U] = 0x24030001U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[3U] = 0x1080000cU;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[4U] = 0x2084ffffU;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[5U] = 0x434021U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[6U] = 0x602021U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[7U] = 0x1003021U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[8U] = 0x1480fffbU;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[9U] = 0x3e00008U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0xaU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0xbU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0xcU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0xdU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__imem[0xeU] = 0U;
    vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__gpr[0x1fU] = 0xfffffffcU;
    vlSelfRef.mips_pipeline_tb__DOT__rst = 1U;
    co_await vlSelfRef.__VtrigSched_hfc2f64f2__0.trigger(0U, 
                                                         nullptr, 
                                                         "@(posedge mips_pipeline_tb.clk)", 
                                                         "tests/mips_pipeline_test.v", 
                                                         81);
    vlSelfRef.__Vm_traceActivity[2U] = 1U;
    co_await vlSelfRef.__VtrigSched_hfc2f64f2__0.trigger(0U, 
                                                         nullptr, 
                                                         "@(posedge mips_pipeline_tb.clk)", 
                                                         "tests/mips_pipeline_test.v", 
                                                         81);
    vlSelfRef.__Vm_traceActivity[2U] = 1U;
    vlSelfRef.mips_pipeline_tb__DOT__rst = 0U;
    mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1 = 0xc8U;
    {
        while (VL_LTS_III(32, 0U, mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1)) {
            co_await vlSelfRef.__VtrigSched_hfc2f64f2__0.trigger(0U, 
                                                                 nullptr, 
                                                                 "@(posedge mips_pipeline_tb.clk)", 
                                                                 "tests/mips_pipeline_test.v", 
                                                                 86);
            vlSelfRef.__Vm_traceActivity[2U] = 1U;
            if (((~ ((IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__id_ex_valid) 
                     | (IData)(vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__if_id_valid))) 
                 & (0U == vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc))) {
                goto __Vlabel1;
            }
            mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1 
                = (mips_pipeline_tb__DOT__unnamedblk1_2__DOT____Vrepeat1 
                   - (IData)(1U));
        }
        __Vlabel1: ;
    }
    VL_WRITEF_NX("PC: %x, V0: %10# (expected 55)\n",0,
                 32,vlSelfRef.mips_pipeline_tb__DOT__dut__DOT__pc,
                 32,vlSelfRef.mips_pipeline_tb__DOT__v0);
    if ((0x37U == vlSelfRef.mips_pipeline_tb__DOT__v0)) {
        VL_WRITEF_NX("TEST PASSED: fib(10) = 55\n",0);
    } else {
        VL_WRITEF_NX("TEST FAILED: fib(10) = %10#, expected 55\n",0,
                     32,vlSelfRef.mips_pipeline_tb__DOT__v0);
    }
    VL_FINISH_MT("tests/mips_pipeline_test.v", 97, "");
    vlSelfRef.__Vm_traceActivity[2U] = 1U;
}

#ifdef VL_DEBUG
VL_ATTR_COLD void Vmips_pipeline_test___024root___dump_triggers__act(Vmips_pipeline_test___024root* vlSelf);
#endif  // VL_DEBUG

void Vmips_pipeline_test___024root___eval_triggers__act(Vmips_pipeline_test___024root* vlSelf) {
    (void)vlSelf;  // Prevent unused variable warning
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    VL_DEBUG_IF(VL_DBG_MSGF("+    Vmips_pipeline_test___024root___eval_triggers__act\n"); );
    auto& vlSelfRef = std::ref(*vlSelf).get();
    // Body
    vlSelfRef.__VactTriggered.set(0U, ((IData)(vlSelfRef.mips_pipeline_tb__DOT__clk) 
                                       & (~ (IData)(vlSelfRef.__Vtrigprevexpr___TOP__mips_pipeline_tb__DOT__clk__0))));
    vlSelfRef.__VactTriggered.set(1U, vlSelfRef.__VdlySched.awaitingCurrentTime());
    vlSelfRef.__Vtrigprevexpr___TOP__mips_pipeline_tb__DOT__clk__0 
        = vlSelfRef.mips_pipeline_tb__DOT__clk;
#ifdef VL_DEBUG
    if (VL_UNLIKELY(vlSymsp->_vm_contextp__->debug())) {
        Vmips_pipeline_test___024root___dump_triggers__act(vlSelf);
    }
#endif
}
