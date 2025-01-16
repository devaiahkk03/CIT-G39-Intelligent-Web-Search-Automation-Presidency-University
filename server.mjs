import express from 'express';
import bodyParser from 'body-parser';
import { getQueryResult } from './Fquery_TSurl.mjs';

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/prompt', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await getQueryResult(prompt);
        res.json({ pageContent: result.pageContent, generatedQuery: result.generatedQuery });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});