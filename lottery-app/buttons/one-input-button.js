import { useEffect, useState } from 'react'

function replacer(key,value) {
    if (Number(key)) return undefined
    else if (key == "0") return undefined
    else return value
}

export const OneInputButton = ({
    web3,
    label,
    clickFunction,
    buttonName,
    placeHolder,
    output,
    type
}) => {
    
    const [variable, setVariable] = useState(null)
    const [value, setValue] = useState('')
    const [title, setTitle] = useState(label)

    useEffect(() => {
        if (type == "send") setTitle(label + " (Requires Gas)")
    }, [type, label])

    const updateVariable = event => {
        setVariable(event.target.value)
    }

    const onClickHandler = async () => {
        if (web3) {
            if (variable !== null) {
                const val = await clickFunction(variable)
                if (type == "call") {
                    setValue(val.toString())
                } else if (type == "send") {
                    setValue(val.transactionHash)
                } else if (type == "object") {
                    setValue(JSON.stringify(val, replacer))
                }
            }
        } else {
            alert("Please connect your wallet")
        }
    }

    return (
        <section>
            <div className="container mt-5">
                <div className="field">
                    <label className="label">{title}</label>
                    <div className="control">
                        <input onChange={updateVariable} className="input" type="text" placeholder={placeHolder}/>
                    </div>
                    <div className="container">
                        <h2>{output}: {value}</h2>
                    </div>
                    <button onClick={onClickHandler} className="button is-primary mt-3">{buttonName}</button>
                </div>
            </div>
        </section>
    )
}