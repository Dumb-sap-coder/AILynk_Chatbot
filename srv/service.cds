using { AILynk_Chatbot as my } from '../db/schema.cds';

@path : '/service/AILynk_ChatbotService'
service AILynk_ChatbotService
{
}

annotate AILynk_ChatbotService with @requires :
[
    'authenticated-user'
];
