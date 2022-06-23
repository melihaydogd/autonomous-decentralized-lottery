import { useEffect, useState } from 'react'

function replacer(key,value) {
    if (Number(key)) return undefined
    else if (key == "0") return undefined
    else return value
}

export const TwoInputButton = ({
    web3,
    label,
    clickFunction,
    buttonName,
    placeHolderOne,
    placeHolderTwo,
    output,
    type
}) => {
    
    const [variableOne, setVariableOne] = useState(null)
    const [variableTwo, setVariableTwo] = useState(null)
    const [value, setValue] = useState('')
    const [title, setTitle] = useState(label)

    useEffect(() => {
        if (type == "send") setTitle(label + " (Requires Gas)")
    }, [type, label])

    const updateVariableOne = event => {
        setVariableOne(event.target.value)
    }

    const updateVariableTwo = event => {
        setVariableTwo(event.target.value)
    }

    const onClickHandler = async () => {
        if (web3) {
            if (variableOne !== null && variableTwo !== null) {
                const val = await clickFunction(variableOne, variableTwo)
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
                        <input onChange={updateVariableOne} className="input" type="text" placeholder={placeHolderOne}/>
                    </div>
                    <div className="control">
                        <input onChange={updateVariableTwo} className="input" type="text" placeholder={placeHolderTwo}/>
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