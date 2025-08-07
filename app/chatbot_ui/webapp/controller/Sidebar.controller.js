sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("chatbotui.controller.Sidebar", {
    onInit() {
      this.getOwnerComponent().getRouter().navTo("nochat");
      this._loadChatList();
      sap.ui.getCore().getEventBus().subscribe("chat", "sessionUpdated", this._loadChatList, this);
      //sap.ui.getCore().getEventBus().publish("chat", "forceReset");
    },

    onNewChat() {
      const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      const newId = "new_" + Date.now(); 
      oRouter.navTo("chatcontainer", { sessionId: newId },true);
      
      console.log("clicked on new chat");
    },

    _loadChatList() {
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

    onSessionSelect(oEvent) {
      const sessionId = oEvent.getParameter("listItem").data("sessionId");
      const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.navTo("chatcontainer", { sessionId }, true);
    }
  });
});
