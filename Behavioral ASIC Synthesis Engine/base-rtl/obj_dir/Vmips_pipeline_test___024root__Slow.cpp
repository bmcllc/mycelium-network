// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Design implementation internals
// See Vmips_pipeline_test.h for the primary calling header

#include "Vmips_pipeline_test__pch.h"
#include "Vmips_pipeline_test__Syms.h"
#include "Vmips_pipeline_test___024root.h"

void Vmips_pipeline_test___024root___ctor_var_reset(Vmips_pipeline_test___024root* vlSelf);

Vmips_pipeline_test___024root::Vmips_pipeline_test___024root(Vmips_pipeline_test__Syms* symsp, const char* v__name)
    : VerilatedModule{v__name}
    , __VdlySched{*symsp->_vm_contextp__}
    , vlSymsp{symsp}
 {
    // Reset structure values
    Vmips_pipeline_test___024root___ctor_var_reset(this);
}

void Vmips_pipeline_test___024root::__Vconfigure(bool first) {
    (void)first;  // Prevent unused variable warning
}

Vmips_pipeline_test___024root::~Vmips_pipeline_test___024root() {
}
