sap.ui.define([
    "sap/ui/core/mvc/Controller"
  ], function (Controller) {
    "use strict";
  
    return Controller.extend("chatbotui.controller.NoChat", {
      onInit: function () {
        const oImage = this.byId("_IDGenImage1");
            if (oImage) {
                const sImagePath = sap.ui.require.toUrl("chatbotui/img/uploara_logo.png");
                oImage.setSrc(sImagePath);
            }
      }
    });
  });
  