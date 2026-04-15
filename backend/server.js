import express from 'express'
import { generate } from './chatbot.js';
import cors from 'cors'
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors())
app.use(express.json());

app.get('/',(req,res)=>{
    res.send('hello world')
})

app.get('/config',(req,res)=>{
    res.json({
        apiUrl: process.env.API_URL || ''
    })
})

app.post('/chat',async (req,res)=>{
    const {message , sessionId} = req.body;

    if(!message || !sessionId){
        res.status(400).json({message:'Invalid request' , success:false})
        return;
    }

    const result = await generate(message,sessionId);
    res.json({message:result , success:true})
})

const PORT = process.env.API_PORT || 1000;

app.listen(PORT,()=>console.log(`server is running on the port : ${PORT}`))