// Verilated -*- C++ -*-
// DESCRIPTION: Verilator output: Model implementation (design independent parts)

#include "Vmips_pipeline_test__pch.h"
#include "verilated_vcd_c.h"

//============================================================
// Constructors

Vmips_pipeline_test::Vmips_pipeline_test(VerilatedContext* _vcontextp__, const char* _vcname__)
    : VerilatedModel{*_vcontextp__}
    , vlSymsp{new Vmips_pipeline_test__Syms(contextp(), _vcname__, this)}
    , rootp{&(vlSymsp->TOP)}
{
    // Register model with the context
    contextp()->addModel(this);
    contextp()->traceBaseModelCbAdd(
        [this](VerilatedTraceBaseC* tfp, int levels, int options) { traceBaseModel(tfp, levels, options); });
}

Vmips_pipeline_test::Vmips_pipeline_test(const char* _vcname__)
    : Vmips_pipeline_test(Verilated::threadContextp(), _vcname__)
{
}

//============================================================
// Destructor

Vmips_pipeline_test::~Vmips_pipeline_test() {
    delete vlSymsp;
}

//============================================================
// Evaluation function

#ifdef VL_DEBUG
void Vmips_pipeline_test___024root___eval_debug_assertions(Vmips_pipeline_test___024root* vlSelf);
#endif  // VL_DEBUG
void Vmips_pipeline_test___024root___eval_static(Vmips_pipeline_test___024root* vlSelf);
void Vmips_pipeline_test___024root___eval_initial(Vmips_pipeline_test___024root* vlSelf);
void Vmips_pipeline_test___024root___eval_settle(Vmips_pipeline_test___024root* vlSelf);
void Vmips_pipeline_test___024root___eval(Vmips_pipeline_test___024root* vlSelf);

void Vmips_pipeline_test::eval_step() {
    VL_DEBUG_IF(VL_DBG_MSGF("+++++TOP Evaluate Vmips_pipeline_test::eval_step\n"); );
#ifdef VL_DEBUG
    // Debug assertions
    Vmips_pipeline_test___024root___eval_debug_assertions(&(vlSymsp->TOP));
#endif  // VL_DEBUG
    vlSymsp->__Vm_activity = true;
    vlSymsp->__Vm_deleter.deleteAll();
    if (VL_UNLIKELY(!vlSymsp->__Vm_didInit)) {
        vlSymsp->__Vm_didInit = true;
        VL_DEBUG_IF(VL_DBG_MSGF("+ Initial\n"););
        Vmips_pipeline_test___024root___eval_static(&(vlSymsp->TOP));
        Vmips_pipeline_test___024root___eval_initial(&(vlSymsp->TOP));
        Vmips_pipeline_test___024root___eval_settle(&(vlSymsp->TOP));
    }
    VL_DEBUG_IF(VL_DBG_MSGF("+ Eval\n"););
    Vmips_pipeline_test___024root___eval(&(vlSymsp->TOP));
    // Evaluate cleanup
    Verilated::endOfEval(vlSymsp->__Vm_evalMsgQp);
}

void Vmips_pipeline_test::eval_end_step() {
    VL_DEBUG_IF(VL_DBG_MSGF("+eval_end_step Vmips_pipeline_test::eval_end_step\n"); );
#ifdef VM_TRACE
    // Tracing
    if (VL_UNLIKELY(vlSymsp->__Vm_dumping)) vlSymsp->_traceDump();
#endif  // VM_TRACE
}

//============================================================
// Events and timing
bool Vmips_pipeline_test::eventsPending() { return !vlSymsp->TOP.__VdlySched.empty(); }

uint64_t Vmips_pipeline_test::nextTimeSlot() { return vlSymsp->TOP.__VdlySched.nextTimeSlot(); }

//============================================================
// Utilities

const char* Vmips_pipeline_test::name() const {
    return vlSymsp->name();
}

//============================================================
// Invoke final blocks

void Vmips_pipeline_test___024root___eval_final(Vmips_pipeline_test___024root* vlSelf);

VL_ATTR_COLD void Vmips_pipeline_test::final() {
    Vmips_pipeline_test___024root___eval_final(&(vlSymsp->TOP));
}

//============================================================
// Implementations of abstract methods from VerilatedModel

const char* Vmips_pipeline_test::hierName() const { return vlSymsp->name(); }
const char* Vmips_pipeline_test::modelName() const { return "Vmips_pipeline_test"; }
unsigned Vmips_pipeline_test::threads() const { return 1; }
void Vmips_pipeline_test::prepareClone() const { contextp()->prepareClone(); }
void Vmips_pipeline_test::atClone() const {
    contextp()->threadPoolpOnClone();
}
std::unique_ptr<VerilatedTraceConfig> Vmips_pipeline_test::traceConfig() const {
    return std::unique_ptr<VerilatedTraceConfig>{new VerilatedTraceConfig{false, false, false}};
};

//============================================================
// Trace configuration

void Vmips_pipeline_test___024root__trace_decl_types(VerilatedVcd* tracep);

void Vmips_pipeline_test___024root__trace_init_top(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd* tracep);

VL_ATTR_COLD static void trace_init(void* voidSelf, VerilatedVcd* tracep, uint32_t code) {
    // Callback from tracep->open()
    Vmips_pipeline_test___024root* const __restrict vlSelf VL_ATTR_UNUSED = static_cast<Vmips_pipeline_test___024root*>(voidSelf);
    Vmips_pipeline_test__Syms* const __restrict vlSymsp VL_ATTR_UNUSED = vlSelf->vlSymsp;
    if (!vlSymsp->_vm_contextp__->calcUnusedSigs()) {
        VL_FATAL_MT(__FILE__, __LINE__, __FILE__,
            "Turning on wave traces requires Verilated::traceEverOn(true) call before time 0.");
    }
    vlSymsp->__Vm_baseCode = code;
    tracep->pushPrefix(std::string{vlSymsp->name()}, VerilatedTracePrefixType::SCOPE_MODULE);
    Vmips_pipeline_test___024root__trace_decl_types(tracep);
    Vmips_pipeline_test___024root__trace_init_top(vlSelf, tracep);
    tracep->popPrefix();
}

VL_ATTR_COLD void Vmips_pipeline_test___024root__trace_register(Vmips_pipeline_test___024root* vlSelf, VerilatedVcd* tracep);

VL_ATTR_COLD void Vmips_pipeline_test::traceBaseModel(VerilatedTraceBaseC* tfp, int levels, int options) {
    (void)levels; (void)options;
    VerilatedVcdC* const stfp = dynamic_cast<VerilatedVcdC*>(tfp);
    if (VL_UNLIKELY(!stfp)) {
        vl_fatal(__FILE__, __LINE__, __FILE__,"'Vmips_pipeline_test::trace()' called on non-VerilatedVcdC object;"
            " use --trace-fst with VerilatedFst object, and --trace with VerilatedVcd object");
    }
    stfp->spTrace()->addModel(this);
    stfp->spTrace()->addInitCb(&trace_init, &(vlSymsp->TOP));
    Vmips_pipeline_test___024root__trace_register(&(vlSymsp->TOP), stfp->spTrace());
}
