sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/FormattedText"
], function (Controller, MessageToast, Text, HBox, VBox, FormattedText) {
    "use strict";

    if (!window.marked) {
        jQuery.sap.includeScript("libs/marked.min.js");
    }

    const URLS = {
        normalQuery: "https://n8n.archlynk.com/webhook/chatbot-query",
        fileUpload: "https://729927921066.ngrok-free.app/api/v1/archAI/file-upload",
        userDocQuery: "https://n8n.archlynk.com/webhook/chatbot-user-doc-query"
    };

    const AUTH = {
        username: "ArchAI_User",
        password: "archAI_user",
        getBasicAuthHeader() {
            return "Basic " + btoa(this.username + ":" + this.password);
        }
    };

    return Controller.extend("chatbotui.controller.ChatContainer", {
        onInit() {
            this._recognition = null;
            this._setupSpeechRecognition();
            this._uploadedFile = null;
            this._chatSessions = this._loadSessions();
            this._transcriptBuffer = "";
            this._hasUploadedFile = false;

            this._appId = this.getOwnerComponent().getManifestEntry("sap.app").id;
            this._storageKey = this._appId + "_chatSessions";

            this._chatSessions = this._loadSessions();

            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("chatcontainer").attachPatternMatched(this._onRouteMatched, this);

            const sImagePath = sap.ui.require.toUrl("chatbotui/img/uploara_logo.png");

            [this.byId("_IDGenImage"), this.byId("_IDGenImage3")].forEach(img => {
                if (img) {
                    img.setSrc(sImagePath);
                }
            });

            this._isBotResponding = false;  // track bot response status

            var oInput = this.byId("messageInput");
            oInput.attachBrowserEvent("keydown", function (oEvent) {
                if (oEvent.key === "Enter" && !oEvent.shiftKey) {
                    oEvent.preventDefault();
                    if (!this._isBotResponding) {
                        this.onSend();
                    }
                }
            }.bind(this));
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
            if (this._isBotResponding) return;

            const oInput = this.getView().byId("messageInput");
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
            const activeSessionId = sessionId;
            //const botThinkingMessage = this._showBotThinking();
            const thinking = this._showBotThinking();
            this._isBotResponding = true;

            const sendQuery = () => {
                let fetchUrl = "";
                let fetchOptions = {};

                if (this._hasUploadedFile) {
                    // Call userDocQuery after file upload, no fileId needed
                    fetchUrl = URLS.userDocQuery;
                    fetchOptions = {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "mode": "no-cors",
                            "Authorization": AUTH.getBasicAuthHeader()
                        },
                        body: JSON.stringify({
                            sessionId: sessionId,
                            query: sMessage
                        })
                    };
                } else {
                    // Normal query without file
                    fetchUrl = URLS.normalQuery;
                    fetchOptions = {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": AUTH.getBasicAuthHeader()
                        },
                        body: JSON.stringify({
                            sessionId: sessionId,
                            query: sMessage
                        })
                    };
                }

                fetch(fetchUrl, fetchOptions)
                    .then(response => response.ok ? response.text() : Promise.reject())
                    .then(text => {
                        //this.byId("chatMessagesBox").removeItem(botThinkingMessage);
                        this.byId("chatMessagesBox").removeItem(thinking.container);
                        this.byId("sendButton").setEnabled(true);
                        this._isBotResponding = false;
                        let botReply = text;
                        try {
                            const json = JSON.parse(text);
                            botReply = json.output || json.response || text;
                        } catch (e) { }
                        if (this._sessionId !== activeSessionId) {
                            const session = this._chatSessions[activeSessionId];
                            if (session) {
                                session.messages.push({
                                    text: botReply,
                                    role: "bot",
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                });
                                this._saveSessions();
                            }
                            return;
                        }

                        this.byId("chatMessagesBox").removeItem(thinking.container);
                        this._addMessage(botReply, "bot");
                        this.byId("sendButton").setEnabled(true);
                        this._isBotResponding = false;
                        //this._addMessage(botReply, "bot");
                    })
                    .catch(() => {
                        //this.byId("chatMessagesBox").removeItem(botThinkingMessage);
                        if (this._sessionId !== activeSessionId) return;
                        this.byId("chatMessagesBox").removeItem(thinking.container);
                        this._addMessage("⚠️ Unable to reach the bot. Please try again.", "bot");
                        this.byId("sendButton").setEnabled(true);
                        this._isBotResponding = false;

                    });
            };

            if (oFile) {
                // Upload file first
                const formData = new FormData();
                formData.append("file", oFile);
                formData.append("sessionId", sessionId); // Keep session consistent

                fetch(URLS.fileUpload, {
                    method: "POST",
                    body: formData
                })

                    .then(response => response.ok ? response.text() : Promise.reject())
                    .then(text => {
                        let botReply = text;
                        try {
                            const json = JSON.parse(text);
                            botReply = json.output || json.response || json.status;
                        } catch (e) { }

                        thinking.textControl.setText(botReply);
                        thinking.textControl.removeStyleClass("botTyping");
                        //this._addMessage(botReply, "bot");
                        if (this._sessionId !== activeSessionId) {
                            const session = this._chatSessions[activeSessionId];
                            if (session) {
                                session.messages.push({
                                    text: botReply,
                                    role: "bot",
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                });
                                this._saveSessions();
                            }
                            return;
                        }

                        thinking.textControl.setText(botReply);
                        thinking.textControl.removeStyleClass("botTyping");
                        this._hasUploadedFile = true;
                        this.byId("sendButton").setEnabled(true);
                        this._isBotResponding = false;

                    })
                    .catch(() => {
                        // this.byId("chatMessagesBox").removeItem(botThinkingMessage);
                        // this._addMessage("⚠️ File upload failed. Please try again.", "bot");
                        if (this._sessionId !== activeSessionId) return;
                        this.byId("sendButton").setEnabled(true);
                        thinking.textControl.setText("⚠️ File upload failed. Please try again.");
                        thinking.textControl.removeStyleClass("botTyping");
                    });
            } else {
                // No file uploaded, normal query
                sendQuery();
            }

            // Clear input and reset file states after sending
            oInput.setValue("");
            this._uploadedFile = null;
            //this._hasUploadedFile = false;
            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();
            oInput.setVisible(true);
            this.byId("micButton").setEnabled(true);

        },

        _addMessage(text, role) {
            const oDate = new Date();
            const timestamp = oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isUser = role === "user";

            // const oMessageText = new Text({ text, wrapping: true }).addStyleClass(isUser ? "userMessage" : "botMessage");
            let oMessageText;
            if (role === "bot") {
                //const formattedText = text.replace(/\n/g, "<br>");
                //const html = this._convertMarkdownLinksToHTML(formattedText); // optional conversion
                const html = this._convertMarkdownToHTML(text);
                oMessageText = new sap.ui.core.HTML({
                    content: `<div class="botMessage">${html}</div>`
                });
                // oMessageText = new sap.m.FormattedText({
                //     htmlText: html
                //    // htmlText: this._convertMarkdownLinksToHTML(text)
                // }).addStyleClass("botMessage");
            } else {
                oMessageText = new sap.m.Text({
                    text: text,
                    wrapping: true
                }).addStyleClass("userMessage");
            }

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
            this._showWelcome(false);
        },

        _scrollToBottom() {
            const oScroll = this.byId("chatScroll");  // updated ID
            setTimeout(() => {
                if (oScroll) {
                    const domRef = oScroll.getDomRef();
                    if (domRef) {
                        oScroll.scrollTo(0, domRef.scrollHeight, 500);
                    }
                }
            }, 100);
        },


        resetChat() {
            this.byId("chatMessagesBox").removeAllItems();
            this.byId("messageInput").setValue("").setVisible(true);
            this._uploadedFile = null;
            this._hasUploadedFile = null;
            this._sessionId = null;
            this.byId("micButton").setEnabled(true);

            const chip = this.byId("uploadedFileChip");
            if (chip) chip.destroy();
            this._showWelcome(true);
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
            if (session.messages.length > 0) {
                this._showWelcome(false);
            } else {
                this._showWelcome(true);
            }
        },

        _generateSessionId() {
            return "session_" + Date.now();
        },

        _loadSessions() {
            const stored = localStorage.getItem(this._storageKey);
            return stored ? JSON.parse(stored) : {};
        },

        _saveSessions() {
            localStorage.setItem(this._storageKey, JSON.stringify(this._chatSessions));
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

        onFileUpload: function () {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".pdf,.doc,.docx,.txt,.ppt,.pptx";

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this._uploadedFile = file; // ⬅️ Only store, don't upload now
                    this._hasSelectedFile = true;
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

            // const oMessageText = new Text({ text, wrapping: true }).addStyleClass(isUser ? "userMessage" : "botMessage");
            let oMessageText;
            if (role === "bot") {
                //const formattedText = text.replace(/\n/g, "<br>");
                //const html = this._convertMarkdownLinksToHTML(formattedText); // optional conversion
                //const html = MarkdownFormatter.parseMarkdown(text);
                const html = this._convertMarkdownToHTML(text);
                oMessageText = new sap.ui.core.HTML({
                    content: `<div class="botMessage">${html}</div>`
                });
                // oMessageText = new sap.m.FormattedText({
                //     htmlText: html
                //    // htmlText: this._convertMarkdownLinksToHTML(text)
                // }).addStyleClass("botMessage");
            } else {
                oMessageText = new sap.m.Text({
                    text: text,
                    wrapping: true
                }).addStyleClass("userMessage");
            }
            const oTimestampText = new Text({ text: timestamp }).addStyleClass("timestampText");
            const oTimestampHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oTimestampText] });
            const oMessageVBox = new VBox({ items: [oMessageText, oTimestampHBox] });
            const oMessageHBox = new HBox({ justifyContent: isUser ? "End" : "Start", items: [oMessageVBox] });

            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();
        },

        _showBotThinking() {
            const oMessageText = new Text({ text: "Analyzing...", wrapping: true }).addStyleClass("botMessage botTyping");
            const oTimestampText = new Text({ text: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }).addStyleClass("timestampText");
            const oTimestampHBox = new HBox({ justifyContent: "Start", items: [oTimestampText] });
            const oMessageVBox = new VBox({ items: [oMessageText, oTimestampHBox] });
            const oMessageHBox = new HBox({ justifyContent: "Start", items: [oMessageVBox] });

            this.byId("chatMessagesBox").addItem(oMessageHBox);
            this._scrollToBottom();
            this.byId("sendButton").setEnabled(false);

            // Return this UI control so you can remove it later
            return {
                container: oMessageHBox,
                textControl: oMessageText
            };
        },

        // _convertMarkdownLinksToHTML(text) {
        //     text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)\((https?:\/\/[^\s)]+)\)/g, (match, label, desc, url) => {
        //         // Remove nested brackets from label
        //         const cleanLabel = label.replace(/\[.*?\]/g, "").trim();
        //         return `<a href="${url}" target="_blank" rel="noopener noreferrer">${cleanLabel} ${desc}</a>`;
        //     });
        //     return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        // },

        _convertMarkdownToHTML(markdownText) {
            if (window.marked) {
                const renderer = new marked.Renderer();

                renderer.link = function (token) {
                    const href = token.href || "#";
                    const text = token.text || token.href || "link";
                    const titleAttr = token.title ? ` title="${token.title}"` : "";

                    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
                };

                // Enable line breaks
                return marked.parse(markdownText, {
                    renderer,
                    breaks: true
                });
            } else {
                return markdownText;
            }
        },


        _showWelcome(visible) {
            this.byId("welcomeContainer").setVisible(visible);
            this.byId("chatScroll").setVisible(!visible);   // updated ID
        }


    });
});
