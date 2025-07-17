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
            this._loadChatList();
            sap.ui.getCore().getEventBus().subscribe("chat", "sessionUpdated", this._loadChatList, this);

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
        },

        _loadChatList: function () {
            const oList = this.byId("_IDGenList");
            oList.removeAllItems();

            const sessions = sessionStorage.getItem("chatSessions");
            if (!sessions) return;

            const sessionMap = JSON.parse(sessions);
            Object.keys(sessionMap).reverse().forEach(sessionId => {
                const title = sessionMap[sessionId].title || "New Chat";
                const item = new sap.m.StandardListItem({
                    title,
                    type: "Active"
                });
                item.data("sessionId", sessionId);
                oList.addItem(item);
            });
        },

        _openChat: function (sessionId) {
            const oChatView = sap.ui.getCore().byId("container-chatbotui---App--_IDGenXMLView2");
            if (oChatView) {
                const oChatCtrl = oChatView.getController();
                if (oChatCtrl && oChatCtrl.loadSession) {
                    oChatCtrl.loadSession(sessionId);
                }
            }
        },

        onSessionSelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            const sessionId = oSelectedItem.data("sessionId");

            const oChatView = sap.ui.getCore().byId("container-chatbotui---App--_IDGenXMLView2");
            if (oChatView) {
                const oChatCtrl = oChatView.getController();
                if (oChatCtrl && oChatCtrl.loadSession) {
                    oChatCtrl.loadSession(sessionId);
                }
            }
        }


    });
});
