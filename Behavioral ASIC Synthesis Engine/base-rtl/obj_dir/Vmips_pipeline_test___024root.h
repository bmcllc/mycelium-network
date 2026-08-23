// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Design internal header
// See Vmips_pipeline_test.h for the primary calling header

#ifndef VERILATED_VMIPS_PIPELINE_TEST___024ROOT_H_
#define VERILATED_VMIPS_PIPELINE_TEST___024ROOT_H_  // guard

#include "verilated.h"
#include "verilated_timing.h"


class Vmips_pipeline_test__Syms;

class alignas(VL_CACHE_LINE_BYTES) Vmips_pipeline_test___024root final : public VerilatedModule {
  public:

    // DESIGN SPECIFIC STATE
    // Anonymous structures to workaround compiler member-count bugs
    struct {
        CData/*0:0*/ mips_pipeline_tb__DOT__clk;
        CData/*0:0*/ mips_pipeline_tb__DOT__rst;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__if_id_valid;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_rs;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_rt;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_rd;
        CData/*5:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_opcode;
        CData/*5:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_funct;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_shamt;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_reg_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_read;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_mem_to_reg;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_src;
        CData/*1:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_alu_op;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_branch;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_jal;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_jr;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_valid;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_rd;
        CData/*5:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_opcode;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_reg_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_read;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_mem_to_reg;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_valid;
        CData/*4:0*/ mips_pipeline_tb__DOT__dut__DOT__mem_wb_rd;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__mem_wb_reg_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__mem_wb_valid;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__pc_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__if_id_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_flush;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__stall;
        CData/*1:0*/ mips_pipeline_tb__DOT__dut__DOT__forward_a;
        CData/*1:0*/ mips_pipeline_tb__DOT__dut__DOT__forward_b;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_reg_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_mem_read;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_mem_write;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_mem_to_reg;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_alu_src;
        CData/*1:0*/ mips_pipeline_tb__DOT__dut__DOT__id_alu_op;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_branch;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_jal;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__id_jr;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__alu_zero;
        CData/*0:0*/ mips_pipeline_tb__DOT__dut__DOT__hazard_unit__DOT__branch_hazard;
        CData/*0:0*/ __VstlFirstIteration;
        CData/*0:0*/ __Vtrigprevexpr___TOP__mips_pipeline_tb__DOT__clk__0;
        CData/*0:0*/ __VactContinue;
        IData/*31:0*/ mips_pipeline_tb__DOT__v0;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__if_id_pc;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__if_id_instr;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_pc;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_rs_val;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_rt_val;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__id_ex_imm;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_alu_result;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_rt_val;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__mem_wb_write_data;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__pc;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__pc_next;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__alu_in_a;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__alu_in_b;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__rt_val_fwd;
    };
    struct {
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__alu_result;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__ex_mem_pc;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__unnamedblk1__DOT__i;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__unnamedblk2__DOT__i;
        IData/*31:0*/ mips_pipeline_tb__DOT__dut__DOT__unnamedblk3__DOT__i;
        IData/*31:0*/ __VactIterCount;
        VlUnpacked<IData/*31:0*/, 32> mips_pipeline_tb__DOT__dut__DOT__gpr;
        VlUnpacked<IData/*31:0*/, 256> mips_pipeline_tb__DOT__dut__DOT__imem;
        VlUnpacked<IData/*31:0*/, 256> mips_pipeline_tb__DOT__dut__DOT__dmem;
        VlUnpacked<CData/*0:0*/, 5> __Vm_traceActivity;
    };
    VlDelayScheduler __VdlySched;
    VlTriggerScheduler __VtrigSched_hfc2f64f2__0;
    VlTriggerVec<1> __VstlTriggered;
    VlTriggerVec<2> __VactTriggered;
    VlTriggerVec<2> __VnbaTriggered;

    // INTERNAL VARIABLES
    Vmips_pipeline_test__Syms* const vlSymsp;

    // CONSTRUCTORS
    Vmips_pipeline_test___024root(Vmips_pipeline_test__Syms* symsp, const char* v__name);
    ~Vmips_pipeline_test___024root();
    VL_UNCOPYABLE(Vmips_pipeline_test___024root);

    // INTERNAL METHODS
    void __Vconfigure(bool first);
};


#endif  // guard
