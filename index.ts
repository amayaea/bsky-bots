import { AtpAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as process from 'process';
import wiki from 'wikipedia'

dotenv.config();

const agent = new AtpAgent({
    service: 'https://bsky.social',
})
 
const main = async () => {
    const result = await getWikipedia()
    post(result)
}

const getWikipedia = async () : Promise<boolean> => {
    const page = await wiki.page('Virginia_Halas_McCaskey')
    const info = await page.infobox()
    return !info.hasOwnProperty('deathDate')
}

const post = async (result: boolean) => {
    await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD!})

    const post: string = result ? 'yes' : 'no'
    console.log(`Posting ${post}`)
    await agent.post({
        text: post
    });
    console.log('Successfully Posted!')
}

main();

const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
const scheduleExpression = '0 12 * * *'; // Run once every three hours in prod

const job = new CronJob(scheduleExpression, main);

job.start();