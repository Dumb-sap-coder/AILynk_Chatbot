sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Configuration"
], (Controller, Configuration) => {
    "use strict";

    return Controller.extend("chatbotui.controller.Sidebar", {
        onInit() {
            // Optional: Set the switch state based on current theme
            const oView = this.getView();
            const bIsDarkMode = sap.ui.getCore().getConfiguration().getTheme() === "sap_fiori_3_dark";
            const oSwitch = oView.byId("themeSwitch");
            if (oSwitch) {
                oSwitch.setState(bIsDarkMode);
            }
        },

        onThemeToggle(oEvent) {
            const bDarkModeEnabled = oEvent.getParameter("state");
            const sTheme = bDarkModeEnabled ? "sap_fiori_3_dark" : "sap_fiori_3";
            sap.ui.getCore().applyTheme(sTheme);
        },
        onNewChat: function () {
            // Get ChatContainer controller
            const oChatView = sap.ui.getCore().byId("container-chatbotui---App--_IDGenXMLView2"); // ID of ChatContainer XMLView in App.view.xml
            if (oChatView) {
              const oChatCtrl = oChatView.getController();
              if (oChatCtrl && oChatCtrl.resetChat) {
                oChatCtrl.resetChat();
              }
            }
          }
    });
});
