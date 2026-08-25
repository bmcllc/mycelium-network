package com.voidmsg.messenger;

import android.os.Bundle;
import android.view.ActionMode;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.voidmsg.messenger.plugins.VoidAnimusPlugin;

public class MainActivity extends BridgeActivity {
    private ActionMode actionMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoidAnimusPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        disableWebViewLongPressMenu();
    }

    /** Long-press no WebView abre ActionMode Android e pode travar a app. */
    private void disableWebViewLongPressMenu() {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.setLongClickable(false);
        webView.setHapticFeedbackEnabled(false);
        webView.setOnLongClickListener(v -> true);
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        if (actionMode == null) {
            actionMode = mode;
            mode.getMenu().clear();
        }
        super.onActionModeStarted(mode);
    }

    @Override
    public void onActionModeFinished(ActionMode mode) {
        actionMode = null;
        super.onActionModeFinished(mode);
    }
}
