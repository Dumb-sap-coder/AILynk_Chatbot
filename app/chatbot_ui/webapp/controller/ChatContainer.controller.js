sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/VBox"
], function (Controller, MessageToast, Text, HBox, VBox) {
    "use strict";

    return Controller.extend("chatbotui.controller.ChatContainer", {

        onInit: function () {
            this._recognition = null;
            this._setupSpeechRecognition();
            this._uploadedFile = null;
        },

        onSend: function () {
            const oView = this.getView();
            const oInput = oView.byId("messageInput");
            const sMessage = oInput.getValue().trim();
            const oFile = this._uploadedFile;

            if (!sMessage && !oFile) {
                MessageToast.show("Please enter a message or upload a file.");
                return;
            }

            if (sMessage) this._addMessage(sMessage, "user");
            if (oFile) this._addMessage("📎 File: " + oFile.name, "user");

            // Simulate bot response
            setTimeout(() => {
                this._addMessage("Hello there!", "bot");
            }, 800);

            // Reset input and file
            oInput.setValue("");
            this._uploadedFile = null;

            // Remove file chip if it exists
            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();

            oInput.setVisible(true);
            this.byId("micButton").setEnabled(true);
        },

        _addMessage: function (text, role) {
            const oDate = new Date();
            const timestamp = oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isUser = role === "user";
        
            // Message bubble
            const oMessageText = new sap.m.Text({
                text: text,
                wrapping: true
            }).addStyleClass(isUser ? "userMessage" : "botMessage");
        
            // Timestamp Text
            const oTimestampText = new sap.m.Text({
                text: timestamp,
                wrapping: false
            }).addStyleClass("timestampText");
        
            // Align timestamp differently for user and bot
            const oTimestampHBox = new sap.m.HBox({
                justifyContent: isUser ? "End" : "Start",
                items: [oTimestampText]
            });
        
            // Combine message and timestamp in a VBox
            const oMessageVBox = new sap.m.VBox({
                items: [oMessageText, oTimestampHBox]
            });
        
            // Align message to left/right based on role
            const oMessageHBox = new sap.m.HBox({
                justifyContent: isUser ? "End" : "Start",
                items: [oMessageVBox]
            });
        
            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();
        },        
        

        _scrollToBottom: function () {
            const oScroll = this.byId("_IDGenScrollContainer1");
            setTimeout(() => {
                const domRef = oScroll.getDomRef();
                if (domRef) {
                    oScroll.scrollTo(0, domRef.scrollHeight, 500);
                }
            }, 100);
        },
        
        onVoiceInput: function () {
            if (!this._recognition) {
                MessageToast.show("Speech recognition not supported.");
                return;
            }
            this._recognition.start();
        },

        _setupSpeechRecognition: function () {
            if (!("webkitSpeechRecognition" in window)) return;

            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-US";

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.byId("messageInput").setValue(transcript);
            };

            recognition.onerror = (event) => {
                MessageToast.show("Speech error: " + event.error);
            };

            this._recognition = recognition;
        },

        onFileUpload: function () {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".pdf,.doc,.docx,.txt";

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this._uploadedFile = file;
                    this._showFileChip(file.name);
                }
            };

            fileInput.click();
        },

        _showFileChip: function (fileName) {
            const oInputWrapper = this.byId("inputWrapper");
            const oTextArea = this.byId("messageInput");
            const oMicButton = this.byId("micButton");

            // Remove existing chip
            const oldChip = this.byId("uploadedFileChip");
            if (oldChip) oldChip.destroy();

            // Hide text input and disable mic
            oTextArea.setVisible(false);
            oMicButton.setEnabled(false);

            // File Chip component
            const oFileChip = new HBox(this.createId("uploadedFileChip"), {
                alignItems: "Center",
                justifyContent: "SpaceBetween",
                width: "100%",
                items: [
                    new Text({ text: "📎 " + fileName }),
                    new sap.m.Button({
                        icon: "sap-icon://decline",
                        type: "Transparent",
                        press: () => {
                            this._uploadedFile = null;
                            oTextArea.setVisible(true);
                            oMicButton.setEnabled(true);

                            const chip = this.byId("uploadedFileChip");
                            if (chip) chip.destroy();
                        }
                    })
                ]
            }).addStyleClass("sapUiSmallMarginTop");

            oInputWrapper.addItem(oFileChip);
        },

        resetChat: function () {
            const oChatBox = this.byId("chatMessagesBox");
            oChatBox.removeAllItems();

            const oInput = this.byId("messageInput");
            oInput.setValue("");
            oInput.setVisible(true);

            this._uploadedFile = null;

            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();

            const micButton = this.byId("micButton");
            if (micButton) micButton.setEnabled(true);
        },

        

    });
});
