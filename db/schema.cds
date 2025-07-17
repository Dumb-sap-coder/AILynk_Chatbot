namespace AILynk_Chatbot;

using { managed } from '@sap/cds/common';

type Role : String enum {
  user;
  bot;
}

entity Chat : managed {
  key ID     : UUID;
  descr      : String;
  messages   : Composition of many Message on messages.chat_ID = $self;
}

entity Message : managed {
  key msg_id    : UUID;   
  response      : String;
  role          : Role;                      
  chat_ID       : Association to Chat;   
}
