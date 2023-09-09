const puppeteer = require('puppeteer');
const fs = require('fs');
const express = require('express')
const app = express()
require('dotenv').config();

let cookies = [];
cookies = JSON.parse(fs.readFileSync('./data/cookies.json', 'utf8'));

const TwitterId = process.env.TWITTER_ID
const TwitterPassword = process.env.TWITTER_PASSWORD
const API_KEY = process.env.API_KEY

app.get('/user', async(req,res) => {
    const id = req.query.id
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY){
        return res.status(401).json('アクセス権限がないか形式が間違っています')
    }
    const follower = await followers(id)
    res.json({ follower: follower })
})


async function followers(username){
    try{
        const browser = await puppeteer.launch({ headless: "false", args: ['--no-sandbox'] });
        const page = await browser.newPage();
    
        await login(page)
        for (let cookie of cookies) {
            await page.setCookie(cookie);
        }
        await page.goto(`https://twitter.com/${username}`)
    
        await page.waitForTimeout(1000);
        const followersCountSelector = `a[href="/${username}/followers"] > span > span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0`;
        const followersCount = await page.$eval(followersCountSelector, el => el.textContent);
        await browser.close();
        return followersCount
    }
    catch(error){
        console.log(error)
        return "ユーザーが見つかりませんでした"
    }
}

async function login(page){
    try {
        if (cookies.length > 0) {
            for (let cookie of cookies) {
                await page.setCookie(cookie);
            }
            await page.goto('https://twitter.com/home');
            return false;
        } else {
            await page.goto('https://twitter.com/i/flow/login');
        }
        await page.waitForTimeout(1000);
    
        if (await page.$('input[name="text"]')) {
            await page.type('input[name="text"]', TwitterId);
    
            const nextButton = await page.$x('//span[contains(text(), "Next")]');
            await nextButton[0].click();
    
            await page.waitForTimeout(1000);
    
            await page.type('input[name="password"]', TwitterPassword);
    
            const loginButton = await page.$x('//span[contains(text(), "Log in")]');
            await loginButton[0].click();
    
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
            const newCookies = await page.cookies();
            fs.writeFileSync('./data/cookies.json', JSON.stringify(newCookies));
            return true
        }
    }
    catch(error){
        console.log(error)
        return false
    }
}

app.listen(process.env.port)