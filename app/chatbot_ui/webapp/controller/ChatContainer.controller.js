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
            this._sessionId = null;
            this._chatSessions = this._loadSessions();
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

            const oMessageText = new sap.m.Text({ text, wrapping: true })
                .addStyleClass(isUser ? "userMessage" : "botMessage");

            const oTimestampText = new sap.m.Text({ text: timestamp })
                .addStyleClass("timestampText");

            const oTimestampHBox = new sap.m.HBox({ justifyContent: isUser ? "End" : "Start", items: [oTimestampText] });
            const oMessageVBox = new sap.m.VBox({ items: [oMessageText, oTimestampHBox] });
            const oMessageHBox = new sap.m.HBox({ justifyContent: isUser ? "End" : "Start", items: [oMessageVBox] });


            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();

            if (!this._sessionId) {
                this._sessionId = this._generateSessionId();
                this._chatSessions[this._sessionId] = { title: "New Chat", messages: [] };
            }

            // Set title to first user message
            if (this._chatSessions[this._sessionId].title === "New Chat" && role === "user") {
                this._chatSessions[this._sessionId].title = text.length > 25 ? text.slice(0, 25) + "..." : text;
                this._saveSessions();
                sap.ui.getCore().getEventBus().publish("chat", "sessionUpdated");
            }

            this._chatSessions[this._sessionId].messages.push({ text, role, timestamp });
            this._saveSessions();
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
            this.byId("chatMessagesBox").removeAllItems();
            this.byId("messageInput").setValue("").setVisible(true);
            this._uploadedFile = null;

            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();

            this.byId("micButton").setEnabled(true);

            // New session
            this._sessionId = null;
        },

        _generateSessionId: function () {
            return "session_" + Date.now();
        },

        _loadSessions: function () {
            const stored = sessionStorage.getItem("chatSessions");
            return stored ? JSON.parse(stored) : {};
        },

        _saveSessions: function () {
            sessionStorage.setItem("chatSessions", JSON.stringify(this._chatSessions));
        },

        loadSession: function (sessionId) {
            const session = this._chatSessions[sessionId];
            if (!session) return;

            this.resetChat();
            this._sessionId = sessionId;

            session.messages.forEach(msg => this._addMessage(msg.text, msg.role));
        }


    });
});
