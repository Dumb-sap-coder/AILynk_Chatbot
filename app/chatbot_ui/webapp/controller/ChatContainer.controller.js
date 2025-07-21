sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/VBox"
], function (Controller, MessageToast, Text, HBox, VBox) {
    "use strict";

    return Controller.extend("chatbotui.controller.ChatContainer", {
        onInit() {
            this._recognition = null;
            this._setupSpeechRecognition();
            this._uploadedFile = null;
            this._chatSessions = this._loadSessions();
            this._transcriptBuffer = "";

            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("chatcontainer").attachPatternMatched(this._onRouteMatched, this);

            const oImage = this.byId("_IDGenImage");
            if (oImage) {
                const sImagePath = sap.ui.require.toUrl("chatbotui/img/logo.png");
                oImage.setSrc(sImagePath);
            }
        },

        _onRouteMatched(oEvent) {
            const sessionId = oEvent.getParameter("arguments").sessionId;

            if (!sessionId || sessionId.startsWith("new")) {
                this._sessionId = null;
                this.resetChat();
            } else {
                this.loadSession(sessionId);
            }
        },

        onSend() {
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

            const sessionId = this._sessionId || this._generateSessionId();
            this._sessionId = sessionId;
            this._addMessage("Bot is thinking...", "bot");

            // Call webhook 
            const username = "ArchAI_User";
            const password = "archAI_user";
            const basicAuth = "Basic " + btoa(username + ":" + password);
            console.log("Sending to:", "/webhook/webhook/chatbot-query");


            fetch("https://n8n.archlynk.com/webhook/chatbot-query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": basicAuth
                },
                body: JSON.stringify({ sessionId: this._sessionId, query: sMessage })
            })
            .then(response => response.ok ? response.text() : Promise.reject())
            .then(text => {
                const lastIndex = this.byId("chatMessagesBox").getItems().length - 1;
                const botThinking = this.byId("chatMessagesBox").getItems()[lastIndex];
                this.byId("chatMessagesBox").removeItem(botThinking); 
            
                let botReply = text;
                try {
                    const json = JSON.parse(text);
                    botReply = json.output || json.response || text;
                } catch (e) {}
                this._addMessage(botReply, "bot");
            })
            .catch(() => {
                const lastIndex = this.byId("chatMessagesBox").getItems().length - 1;
                const botThinking = this.byId("chatMessagesBox").getItems()[lastIndex];
                this.byId("chatMessagesBox").removeItem(botThinking);
            
                this._addMessage("⚠️ Unable to reach the bot. Please try again.", "bot");
            });
            // Clear input and file
            oInput.setValue("");
            this._uploadedFile = null;

            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();

            oInput.setVisible(true);
            this.byId("micButton").setEnabled(true);
        },

        _addMessage(text, role) {
            const oDate = new Date();
            const timestamp = oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isUser = role === "user";

            const oMessageText = new Text({ text, wrapping: true }).addStyleClass(isUser ? "userMessage" : "botMessage");
            const oTimestampText = new Text({ text: timestamp }).addStyleClass("timestampText");
            const oTimestampHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oTimestampText] });
            const oMessageVBox = new VBox({ items: [oMessageText, oTimestampHBox] });
            const oMessageHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oMessageVBox] });

            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();

            if (!this._sessionId) {
                this._sessionId = this._generateSessionId();
                this._chatSessions[this._sessionId] = { title: "", messages: [] };
            }

            const session = this._chatSessions[this._sessionId];
            if (session.title === "" && role === "user") {
                session.title = text.length > 25 ? text.slice(0, 25) + "..." : text;
                this._saveSessions();
                sap.ui.getCore().getEventBus().publish("chat", "sessionUpdated");
            }

            session.messages.push({ text, role, timestamp });
            this._saveSessions();
        },

        _scrollToBottom() {
            const oScroll = this.byId("_IDGenScrollContainer1");
            setTimeout(() => {
                const domRef = oScroll.getDomRef();
                if (domRef) {
                    oScroll.scrollTo(0, domRef.scrollHeight, 500);
                }
            }, 100);
        },

        resetChat() {
            this.byId("chatMessagesBox").removeAllItems();
            this.byId("messageInput").setValue("").setVisible(true);
            this._uploadedFile = null;
            this._sessionId = null;
            this.byId("micButton").setEnabled(true);

            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();
        },

        loadSession(sessionId) {
            const session = this._chatSessions[sessionId];
            if (!session) {
                this.resetChat();
                return;
            }

            this.resetChat();
            this._sessionId = sessionId;

            session.messages.forEach(msg => this._renderMessage(msg.text, msg.role, msg.timestamp));
        },

        _generateSessionId() {
            return "session_" + Date.now();
        },

        _loadSessions() {
            const stored = sessionStorage.getItem("chatSessions");
            return stored ? JSON.parse(stored) : {};
        },

        _saveSessions() {
            sessionStorage.setItem("chatSessions", JSON.stringify(this._chatSessions));
            sap.ui.getCore().getEventBus().publish("chat", "sessionUpdated");
        },

        onVoiceInput() {
            const micBtn = this.byId("micButton");
            const sendBtn = this.byId("sendButton");
        
            if (!this._recognition) {
                MessageToast.show("Speech recognition not supported.");
                return;
            }
        
            if (!this._isRecording) {
                micBtn.setIcon("sap-icon://decline");
                micBtn.addStyleClass("recordingGlow");
                this._recognition.start();
                this._isRecording = true;
                sendBtn.setEnabled(false);               
            } else {
                this._recognition.stop();
                micBtn.setIcon("sap-icon://microphone");
                micBtn.removeStyleClass("recordingGlow");
                this._isRecording = false;
                this._transcriptBuffer = "";
                sendBtn.setEnabled(true);   
            }
        },
        

        _setupSpeechRecognition() {
            if (!("webkitSpeechRecognition" in window)) return;

            const recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onresult = (event) => {
                let interimTranscript = "";
                let finalTranscript = "";
            
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + " ";
                    } else {
                        interimTranscript += transcript + " ";
                    }
                }
            
                // Combine with buffer only finalized results
                if (finalTranscript) {
                    this._transcriptBuffer += finalTranscript;
                }
            
                // Show live value in input
                const combined = (this._transcriptBuffer + interimTranscript).trim();
                this.byId("messageInput").setValue(combined);
            };
            

            recognition.onerror = (event) => {
                MessageToast.show("Speech error: " + event.error);
                recognition.stop();
            };

            this._recognition = recognition;
        },

        onFileUpload() {
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

        _showFileChip(fileName) {
            const oInputWrapper = this.byId("inputWrapper");
            const oTextArea = this.byId("messageInput");
            const oMicButton = this.byId("micButton");

            const oldChip = this.byId("uploadedFileChip");
            if (oldChip) oldChip.destroy();

            oTextArea.setVisible(false);
            oMicButton.setEnabled(false);

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
        _renderMessage(text, role, timestamp) {
            const isUser = role === "user";

            const oMessageText = new Text({ text, wrapping: true }).addStyleClass(isUser ? "userMessage" : "botMessage");
            const oTimestampText = new Text({ text: timestamp }).addStyleClass("timestampText");
            const oTimestampHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oTimestampText] });
            const oMessageVBox = new VBox({ items: [oMessageText, oTimestampHBox] });
            const oMessageHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oMessageVBox] });

            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();
        },

    });
});
