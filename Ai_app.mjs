import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';
import 'cheerio';

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tavily } from "@tavily/core";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// Load environment variables from .env file
dotenv.config();

const openai = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large"
});

async function generateSearchQuery(inputPrompt, numResults = 1) {
  const messages = [
    new SystemMessage("You are a helpful assistant"),
    new HumanMessage(`Generate any latest ${numResults} search query for: ${inputPrompt}`),
  ];

  try {
    const response = await openai.invoke(messages);
    console.log('Response:', response); // Log the response to understand its structure
    const responseText = response.content.trim();
    return responseText;
  } catch (error) {
    console.error('Error generating search query:', error);
    return null;
  }
}

async function getSearchResults(query, numResults = 5) {
  try {
    const tavilySearch = new TavilySearchResults({
      maxResults: numResults,
      apiKey: "use-your-api-key", // Use the API key from the environment variables
    });

    const Sresults = await tavilySearch.invoke({
      input: query
    });

    // console.log('Tavily Search Results:', Sresults); // Log the results to understand its structure

    const contentString = JSON.stringify(Sresults);

    // Function to extract URLs from the string
    function extractUrlsFromString(str) {
      const urlRegex = /(https?:\/\/[^\s,]+)/g;
      return str.match(urlRegex);
    }

    // Function to clean URLs
    function cleanUrls(urls) {
      return urls.map(url => url.replace(/\\"+/g, ''));
    }

    // Extract and clean URLs
    const urls = extractUrlsFromString(contentString);
    const cleanedUrls = cleanUrls(urls);
    return cleanedUrls;
  } catch (error) {
    console.error('Error fetching search results:', error.response ? error.response.data : error.message);
    return null;
  }
}

function cleanContent(content) {
  return content.replace(/(?:\r\n|\r|\n|\s)+/g, ' ').trim();
}

async function extractContentFromUrls(urls) {
  const tvly = tavily({ apiKey: "use-your-api-key" });

  const response = await tvly.extract(urls);

  const documents = response.results.map(result => new Document({
    pageContent: cleanContent(result['rawContent']),
    metadata: { source: result['url'] }
  }));
  console.log('Documents:', documents);
  
  return documents;
}

export async function getQueryResult(inputPrompt) {
  const generatedQuery = await generateSearchQuery(inputPrompt, 1);
  if (generatedQuery) {
    const urls = await getSearchResults(generatedQuery, 5);
    if (urls) {
      const rawContents = await extractContentFromUrls(urls);
      console.log(rawContents);
      const docs = rawContents;
      

      const vectorStore = new MemoryVectorStore(embeddings);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, chunkOverlap: 200
      });
      const allSplits = await splitter.splitDocuments(docs);
      // console.log('All Splits:', allSplits);

      // // Check if allSplits is not empty
      // if (allSplits.length === 0) {
      //   console.error('No splits were created from the documents.');
      //   return;
      // }

      // Index chunks
      await vectorStore.addDocuments(allSplits);
      

      // const queryEmbedding = await embedQuery(generatedQuery);

      // Perform similarity search
      const searchResults = await vectorStore.similaritySearch(generatedQuery, 2);
      const context = searchResults.map(result => result.pageContent).join("\n");
      const question = generatedQuery;

      console.log('Context:', context);
      console.log('Question:', question);

      // Check if context and question are not null or undefined
      if (!context || !question) {
        console.error('Context or question is null or undefined');
        return;
      }

      const prompt = `
        You are an expert websearch assistant.
        Give me a Detailed answer the question based only on the context provided.
        Focus on technical details, implementation specifics, factual, objective information or emerging trends if any.
        Maintain a consistent technical depth.
        Avoid redundancy and repetition.
        DO NOT add a preamble like "Based on the provided context ..."or "The context provided does not explicitly ...".
        
        
        
        Context: ${context}
        
        Question: ${question}`;

      const chat = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      });

      const messages = [
        new SystemMessage("You are a websearch assistant and you have to give a very detailed answer to the question based on the context provided"),
        new HumanMessage(prompt)
      ];

      const response = await chat.invoke(messages);
      return { pageContent: response.content, generatedQuery: question };
    }
  }
  return { pageContent: 'No results found', generatedQuery: '' };
}
