import {FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, Typography} from "@material-ui/core"
import * as _ from "lodash"
import * as moment from "moment"
import * as React from "react"
import {PlayStyleProgressionPoint} from "../../../../Models/Player/PlayStyle"
import {getProgression} from "../../../../Requests/Player/getProgression"
import {convertSnakeAndCamelCaseToReadable} from "../../../../Utils/String"
import {ClearableDatePicker} from "../../../Shared/ClearableDatePicker"
import {FieldSelect} from "./FieldSelect"
import {ProgressionChart} from "./ProgressionChart"

interface Props {
    players: Player[]
}

export type TimeUnit = "day" | "month" | "quarter" | "year"
export const timeUnits: TimeUnit[] = ["day", "month", "quarter", "year"]

interface State {
    playStyleProgressions: PlayStyleProgressionPoint[][]
    fields: string[]
    selectedFields: string[]
    startDate: moment.Moment | null
    endDate: moment.Moment | null
    timeUnit: "day" | "month" | "quarter" | "year"
}

export class PlayerProgressionCharts extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            playStyleProgressions: [],
            fields: [],
            selectedFields: [],
            startDate: null,
            endDate: null,
            timeUnit: "month"
        }
    }

    public componentDidMount() {
        this.handleAddPlayers(this.props.players)
        this.updateFields()
    }

    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>) {
        if (this.props.players.length > prevProps.players.length) {
            const newPlayers = this.props.players.filter((player) => prevProps.players.indexOf(player) === -1)
            this.handleAddPlayers(newPlayers)
        }
        if (this.props.players.length < prevProps.players.length) {
            const indicesToRemove: number[] = []
            prevProps.players
                .forEach((player, i) => {
                    if (this.props.players.indexOf(player) === -1) {
                        indicesToRemove.push(i)
                    }
                })
            this.handleRemovePlayers(indicesToRemove)
        }

        if (this.state.playStyleProgressions.length !== prevState.playStyleProgressions.length) {
            this.updateFields()
        }

        if ((this.state.timeUnit !== prevState.timeUnit)
            || (this.state.startDate !== prevState.startDate)
            || (this.state.endDate !== prevState.endDate)) {
            this.refreshAllData()
            this.updateFields()
        }
    }

    public render() {
        const {players} = this.props
        const {playStyleProgressions} = this.state
        if (playStyleProgressions.length === 0) {
            return null
        }

        const playerPlayStyleProgressions = playStyleProgressions.map((playStyleProgressionPoints, i) => ({
            player: players[i],
            playStyleProgressionPoints
        }))

        return (
            <>
                <Grid item xs={12} style={{textAlign: "center"}} container>
                    <Grid item xs={12}>
                        <FieldSelect fields={this.state.fields}
                                     selectedFields={this.state.selectedFields}
                                     handleChange={this.handleSelectChange}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl>
                            <InputLabel>Duration</InputLabel>
                            <Select
                                value={this.state.timeUnit}
                                onChange={this.handleTimeUnitChange}
                                autoWidth
                            >
                                {timeUnits.map((timeUnit) => (
                                        <MenuItem value={timeUnit} key={timeUnit}>
                                            {convertSnakeAndCamelCaseToReadable(timeUnit)}
                                        </MenuItem>
                                    )
                                )}
                            </Select>
                            <FormHelperText>Select duration represented by each point</FormHelperText>
                        </FormControl>

                    </Grid>
                    <Grid item xs={12}>
                        <ClearableDatePicker value={this.state.startDate}
                                             onChange={this.handleStartDateChange}
                                             label="Start date"/>
                    </Grid>
                    <Grid item xs={12}>
                        <ClearableDatePicker value={this.state.endDate}
                                             onChange={this.handleEndDateChange}
                                             label="End date"/>
                    </Grid>
                </Grid>
                {this.state.selectedFields.map((field) => {
                    return (
                        <Grid item xs={12} md={6} lg={5} key={field}
                              style={{height: 400}}>
                            <Typography variant="subheading" align="center">
                                {convertSnakeAndCamelCaseToReadable(field)}
                            </Typography>
                            <ProgressionChart field={field} playerPlayStyleProgressions={playerPlayStyleProgressions}/>
                        </Grid>
                    )
                })}
            </>
        )
    }

    private readonly updateFields = () => {
        // TODO: Check if this is necessary, or if it can just be gotten from the first guy.
        const fields = _.uniq(
            _.flatMap(this.state.playStyleProgressions,
                ((playStyleProgression) =>
                        _.flatMap(playStyleProgression,
                            ((playStyleProgressionPoint) =>
                                playStyleProgressionPoint.dataPoints
                                    .map((dataPoint) => dataPoint.name))
                        )
                )
            )
        )
        this.setState({fields})
    }

    private readonly refreshAllData = () => {
        Promise.all(this.props.players.map((player) => this.getProgressionForPlayer(player.id)))
            .then((playStyleProgressions) => {
                this.setState({playStyleProgressions})
            })
    }

    private readonly handleAddPlayers = (players: Player[]) => {
        Promise.all(players.map((player) => this.getProgressionForPlayer(player.id)))
            .then((playersProgressions) => {
                this.setState({
                    playStyleProgressions: [...this.state.playStyleProgressions, ...playersProgressions]
                })
            })
    }

    private readonly getProgressionForPlayer = (playerId: string) => {
        return getProgression(playerId, {
            timeUnit: this.state.timeUnit === null ? undefined : this.state.timeUnit,
            startDate: this.state.startDate === null ? undefined : this.state.startDate,
            endDate: this.state.endDate === null ? undefined : this.state.endDate
        })
    }

    private readonly handleRemovePlayers = (indicesToRemove: number[]) => {
        this.setState({
            playStyleProgressions: this.state.playStyleProgressions
                .filter((__, i) => indicesToRemove.indexOf(i) !== -1)
        })
    }

    private readonly handleSelectChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
        this.setState({
            selectedFields: event.target.value as any as string[]
        })
    }

    private readonly handleStartDateChange = (startDate: moment.Moment | null) => {
        this.setState({startDate})
    }

    private readonly handleEndDateChange = (endDate: moment.Moment | null) => {
        this.setState({endDate})
    }

    private readonly handleTimeUnitChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
        this.setState({timeUnit: event.target.value as TimeUnit})
    }
}
