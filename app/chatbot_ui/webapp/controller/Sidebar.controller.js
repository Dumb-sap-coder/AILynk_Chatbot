sap.ui.define([
      "sap/ui/core/mvc/Controller"
], function (Controller) {
      "use strict";

      return Controller.extend("chatbotui.controller.Sidebar", {
            onInit() {
                  this.getOwnerComponent().getRouter().navTo("nochat");
                  this._appId = this.getOwnerComponent().getManifestEntry("sap.app").id; 
                  this._storageKey = this._appId + "_chatSessions"; 
                  this._loadChatList();
                  sap.ui.getCore().getEventBus().subscribe("chat", "sessionUpdated", this._loadChatList, this);
                  //sap.ui.getCore().getEventBus().publish("chat", "forceReset");
            },

            onNewChat() {
                  const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                  const newId = "new_" + Date.now();
                  oRouter.navTo("chatcontainer", { sessionId: newId }, true);

                  console.log("clicked on new chat");
            },

            _loadChatList() {
                  const oList = this.byId("_IDGenList");
                  oList.removeAllItems();

                  const sessions = localStorage.getItem(this._storageKey);
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
            },

            onChatOptionsPress: function (oEvent) {
                  var oButton = oEvent.getSource();

                  if (!this._oActionSheet) {
                        this._oActionSheet = new sap.m.ActionSheet({
                              showCancelButton: true,
                              buttons: [
                                    new sap.m.Button({ text: "Edit Title", press: this.onEditTitle.bind(this) }),
                                    new sap.m.Button({ text: "Delete", type: "Reject", press: this.onDeleteChat.bind(this) }),
                                    new sap.m.Button({ text: "Hide", press: this.onHideChat.bind(this) })
                              ]
                        });
                  }

                  this._oActionSheet.openBy(oButton);
            },

            onEditTitle: function () {
                  // inline edit or dialog prompt for renaming
            },

            onDeleteChat: function () {
                  // delete chat logic
            },

            onHideChat: function () {
                  // hide chat logic
            }

      });
});


