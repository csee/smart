import { createRouter } from 'next-connect'
import multer from 'multer'
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai')

const API_KEY = process.env.GEMINI_API_KEY
const MODEL_NAME = 'gemini-pro-vision'

const upload = multer({
    storage: multer.memoryStorage()
})

const router = createRouter()

router.use(upload.single('image'))

router.all((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end()
    } else {
        next()
    }
})
router.post(async (req, res) => {
    console.log('req.file:', req.file)
    try {
        console.log('Starting request...')
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: MODEL_NAME })

        const generationConfig = {
            temperature: 0.8,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
        }

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }
        ]

        if (!req.file) {
            console.log('No file uploaded.')
            return res.status(400).json({ error: 'No file uploaded.' })
        }

        const parts = [
            {
                text: '你是一位苛刻专业的摄影艺术评论家，负责对摄影作品进行深入的分析和差评价。你的目标是通过无情的从照片里找到不足之处，加以嘲讽的语气指出。 分析并解读摄影作品的构图元素、照片内容的表现力和意义、色调和色彩运用等各个角度进行嘲讽。语气暴躁，反讽。善用诸如“负分滚出”等语句。'
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: req.file.buffer.toString('base64')
                }
            }
        ]

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig,
            safetySettings
        })

        if (!result) {
            return res.status(502).json({ error: 'Bad Gateway' })
        } else {
            const responseText = result.response.text()
            return res.status(200).json({ result: responseText })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
}

export default router.handler()
