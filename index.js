import homesynck from "homesynck-sdk"
import kleur from 'kleur'
import prompts from 'prompts'

async function main() {
    let state = {
        exit: false,
        turn: 0,
        connection: null,
        directory: null,
        has_logged_in: false
    }

    let header = "================================\n"
    header    += "| HOMESYNCK CLI                |\n"
    header    += "================================\n"
    header += "\n\n"

    while(!state.exit) {
        console.clear()
        console.log(kleur.cyan(header))
        await run(state)
    }
}

async function run(state) {
    let choices = [
        { title: 'Connect & Sign in', value: 'connect', disabled: !!state.connection },
        { title: 'Open directory', value: 'open', disabled: !state.has_logged_in },
        { title: 'Create directory', value: 'create', disabled: true},
        { title: 'Show messages', value: 'lookup', disabled: !state.directory},
        { title: 'Push message', value: 'push', disabled: !state.directory},
        { title: 'Exit', value: 'exit' }
    ]

    let resp = await prompts({
        type: 'select',
        name: 'menu',
        message: 'Main menu',
        choices: choices
    })

    switch(resp.menu) {
        case "exit":
            state.exit = true
            break
        case "connect":
            await connect(state)
            await login(state)
            break
        case "open":
            await open(state)
            break
        case "lookup":
            await show(state)
            break
        case "push":
            await push(state)
            break
    }

    state.turn++
}

async function connect(state) {
    let resp = await prompts({
        type: 'select',
        name: 'url',
        message: 'Pick a server URL',
        choices: [
            { title: 'ws://localhost:4000/socket', value: 'ws://localhost:4000/socket' },
            { title: '+ new', value: 'new' },
        ]
    })

    if(resp.url == "new") {
        resp = await prompts({
            type: 'text',
            name: 'url',
            message: `Type new URL`,
            initial: `ws://`
        })
    }

    state.connection = await homesynck.init(resp.url)
}

async function login(state) {
    let resp = await prompts([
        {
            type: 'text',
            name: 'login',
            message: `Username`
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password'
        }])

    await state.connection.login({
        login: resp.login,
        password: resp.password
    })

    state.has_logged_in = true
}

async function open(state) {
    let resp = await prompts({
        type: 'text',
        name: 'directory_name',
        message: `Directory name`
    })

    state.directory = await state.connection.openOrCreateDirectory(resp.directory_name)

    state.directory.onUpdateReceived(({instructions, rank}, state) => {
        state[`${rank}`] = {message: instructions, known: false}
        return state;
    })

    await state.directory.startSyncing()
}

async function push(state) {
    let resp = await prompts({
        type: 'text',
        name: 'instructions',
        message: `Message`
    })
    
    await state.directory.pushInstructions(resp.instructions)
}

async function show(state) {
    Object.keys(state.directory.state).forEach(function(key) {
        let text = state.directory.state[key].message;

        if(!state.directory.state[key].known) {
            state.directory.state[key].known = true
            text = " " + text
            text = kleur.bgGreen().white("NEW!") + text
        }

        console.log(key, text);
    });

    console.log("\n\n")

    await prompts({
        type: 'text',
        name: 'ignored',
        message: `Press enter to continue`
    })
}

main()