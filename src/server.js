const express = require('express')
const app = express()
const PORT = 5050

app.use(express.json())
app.get('/', (req, res) => {
    res.send('Hello from Express server!')
})

app.post('/test', (req, res) => {
    res.json({
        message: 'Data received successfully',
        body: req.body,
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

