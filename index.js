import querystring from 'querystring'
import express from 'express'
import cookieParser from 'cookie-parser';
import crypto from 'crypto'
import cors from 'cors'
import dontenv from 'dotenv'
import request from 'request'
import axios from 'axios'

dontenv.config()

const PORT = process.env.PORT || 3000

const redirect_uri = `http://localhost:${PORT}/callback`

const stateKey = 'spotify_auth_state'

const generateRandomString = (length) => {
    return crypto
    .randomBytes(100)
    .toString('hex')
    .slice(0, length)
}

const app = express()
app .use(cors())
    .use(cookieParser())

app.get('/login', (req, res) => {
    const state = generateRandomString(16)
    const response_type = 'code'
    const scope = 'user-read-private user-read-email user-top-read'

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

    if (refreshToken && accessToken) {
        res.redirect('/refresh_token?'+ querystring.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
        }))
    }

    let authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        data: new URLSearchParams({
            code,
            redirect_uri,
            grant_type: 'authorization_code'
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
        }
    };
    
    axios(authOptions)
        .then(response => {
            const body = response.data;
    
            if (response.status !== 200) {
                console.log("error is " + body.error + ' response status: ' + response.status);
                res.status(500).end("SOMETHING SUSSY AGAIN");
            } else {
                console.log(body);
                accessToken = body.access_token;
                refreshToken = body.refresh_token;
    
                req.query.refresh_token = refreshToken;
                req.query.access_token = accessToken;
    
                console.log("accessToken initial: " + accessToken);
    
                axios.get('https://api.spotify.com/v1/me',
                    {
                        headers: {'Authorization': 'Bearer ' + accessToken}
                    }
                )
                    .then(response => {
                        console.log(response.data);
                    })
                    .catch(error => {
                        console.log('Error fetching user data:', error);
                    });
    
                res.redirect('/?' + querystring.stringify({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                }));
            }
        })
        .catch(error => {
            console.error('Error during token exchange:', error);
            res.status(500).end("SOMETHING SUSSY AGAIN");
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
    let accessToken = req.query.access_token || null;

    //console.log('access tokennnn', accessToken) successfully getting the accessToken here

    axios.get(
        'https://api.spotify.com/v1/me/top/artists',
        {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json',
            },
            params: {
                limit: 10,
                time_range: 'short_term',
            },
        }
    )
        .then(response => {
            console.log(response)
            res.json(response.data)
        })
        .catch(err => {
            console.log(err)
            res.status(404).json(err)
        })

});

app.listen(PORT, () => {
    console.log("App started at the port " + PORT)
    console.log(process.env.CLIENT_ID)
    console.log(process.env.PORT)
})
