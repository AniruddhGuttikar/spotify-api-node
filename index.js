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
app .use(cors())
    .use(cookieParser())

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
            show_dialog: false,
        })
    )
})

app.get('/callback', (req, res) =>  {
    const state = req.query.state || null
    const code = req.query.code || null
    const storedState = req.cookies[stateKey] || null

    console.log("state " + state)
    console.log("code " + code)
    console.log("storedState " + storedState)
    
    if (state !== storedState) {
        res.status(401).end("something sussy is happening");
        return;  // Stop execution if state is not valid
    }

    res.clearCookie(stateKey)
    
    let accessToken = req.query.access_token || null
    let refreshToken = req.query.refresh_token || null

    if (!refreshToken) {
        
    }


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
            accessToken = body.access_token
            refreshToken = body.refresh_token
            //res.json({ access_token: accessToken });
            req.query.refresh_token = refreshToken
            //res.send("now go to / for some more action")
            //res.json({'yo': 'hoi'})
            console.log("refresh token 1: " + req.query.refresh_token)

            let options = {
                url: 'https://api.spotify.com/v1/me',
                headers: {'Authorization': 'Bearer ' + accessToken},
                json: true,
            }

            request.get(options, (error, respone, body) => {
                
                console.log(body)
            })

            res.redirect('/?' + querystring.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
            }))
            
        }
    });

});

app.get('/refresh_token', (req, res) => {
    const refreshToken = req.query.refresh_token
    let authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
        },
        json: true
    }

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            let accessToken = body.access_token
            let refreshToken = body.refresh_token
            res.redirect('/?' + querystring.stringify({
                accessToken,
                refreshToken,
            }))
        }
    })

})

app.get('/', (req, res) => {
    let accessToken = req.query.access_token || null
    let refreshToken = req.query.refresh_token || null

    
    console.log('access token in the /', accessToken)
    console.log('refresh token in the /', refreshToken)
    res.json({accessToken, refreshToken})
})

app.listen(PORT, () => {
    console.log("App started at the port " + PORT)
    console.log(process.env.CLIENT_ID)
    console.log(process.env.PORT)
})
