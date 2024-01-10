import querystring from 'querystring'
import express from 'express'
import cookieParser from 'cookie-parser';
import crypto from 'crypto'
import cors from 'cors'
import dontenv from 'dotenv'
import request from 'request'


dontenv.config()

const PORT = process.env.PORT || 3000
const redirect_uri = `http://localhost:${PORT}/callback`

const stateKey = 'spotify_auth_state'

const generateRandomString = (length) => {
    return crypto
    .randomBytes(length)
    .toString('hex')
    .slice(0, length)
}

const app = express()
app.use(cors()).use(cookieParser())

app.get('/login', (req, res) => {
    const state = generateRandomString(16)
    const response_type = 'code'
    const scope = 'user-read-private user-read-email'

    res.cookie(stateKey, state)

    res.redirect('https://accounts.spotify.com/authorize?'+
        querystring.stringify({
            client_id: process.env.CLIENT_ID,
            response_type,
            scope,
            redirect_uri,
            state,
            show_dialog: true,
        })
    )
})

app.get('/callback', (req, res) =>  {
    const state = req.query.state || null
    const code = req.query.code || null
    const storedState = req.cookies[stateKey] || null

    console.log(state)
    console.log(code)
    console.log(storedState)
    
    if (state !== storedState) {
        res.status(401).end("something sussy is happening");
        return;  // Stop execution if state is not valid
    }

    res.clearCookie(stateKey)
    
    let authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code,
            redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            console.log("error is " + error + ' response status: '+ response.statusCode)
            res.status(500).end("SOMETHING SUSSY AGAIN")

        } else {
            console.log(body)
            const accessToken = body.access_token
            //res.json({ access_token: accessToken });
            res.send("now go to / for some more action")
        }
    });
});

app.listen(PORT, () => {
    console.log("App started at the port " + PORT)
    console.log(process.env.CLIENT_ID)
    console.log(process.env.PORT)
})
