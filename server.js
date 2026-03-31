import express from 'express'
import { generate } from './chatbot.js';
import cors from 'cors'
// node cache which acts as in memory database to give llm memory support



const app = express();
app.use(cors())
app.use(express.json());

app.get('/',(req,res)=>{

    res.send('hello world')
 }
)

app.post('/chat',async (req,res)=>{
    const {message , sessionId} = req.body;

    if(!message || !sessionId){
        res.status(400).json({message:'Invalid request' , success:false})
        return;
    }

    const result = await generate(message,sessionId);
    res.json({message:result , success:true})
})
const PORT = 1000;

app.listen(PORT,()=>console.log(`server is running on the port : ${PORT}`))