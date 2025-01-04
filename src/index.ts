import { AtpAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
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

main().catch(err => {
    console.error(err);
    process.exit(1); // Retry Job Task by exiting the process
});