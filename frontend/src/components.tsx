import React, { useEffect, useState } from "react";
import { useSpring, animated } from 'react-spring'
import { Alert, AlertTitle } from '@material-ui/lab';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import FeedbackIcon from '@material-ui/icons/Feedback';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Toolbar from '@material-ui/core/Toolbar';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import marked from 'marked';
import { useHover, useInterval, useWindowMaxDimension } from './hooks';
import { useLifecycle, deploy, deploying, failed, initial, restart, setup, stop, stopping } from './lifecycle';
import { useParams } from "react-router-dom";
import Zoom from '@material-ui/core/Zoom';
import Fade from '@material-ui/core/Fade';
import { TransitionProps } from '@material-ui/core/transitions';
import { Container } from "@material-ui/core";
import { getInstanceDetails } from "./api";
import { fetchWithTimeout } from "./utils";

export function Background({state}: {state: string}) {
    const preloading = state == "PRELOADING";
    const loading = state == "LOADING";
    const blurFactor = preloading ? 0 : 10;
    const dimension = useWindowMaxDimension();

    useEffect(() => {
        const className = "loading";
        if (loading) {
            document.body.classList.add(className);
        }
        return () => { document.body.classList.remove(className); }
      });

    return (
        <React.Fragment>
            <div className="box-bg box-fullscreen bg-screen" style={{filter: `blur(${blurFactor}px)`}}></div>
            <div className="box-bg box-fullscreen">
                <div id="svgBox" className="box-svg" data-state={preloading ? 2 : 1} style={{width: dimension, height: dimension}}>
                    <svg id="svg" width={dimension} height={dimension} viewBox="0 0 1535 1535" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 483.5H1535" stroke="#C4C4C4" strokeWidth="120"/>
                        <path d="M0 820H1535" stroke="#DBDCDC" strokeWidth="120"/>
                        <path d="M0 1363.5H1535" stroke="#DBDCDC" strokeWidth="120"/>
                        <path d="M0 130.5H1535" stroke="#FF1864"/>
                        <path d="M0 249.5H1535" stroke="#C4C4C4"/>
                        <path d="M0 397.5H1535" stroke="#FF1864"/>
                        <path d="M0 513.5H1535" stroke="#000000"/>
                        <path d="M0 620.5H1535" stroke="#C4C4C4"/>
                        <path d="M0 688.5H1535" stroke="#6E6E6E"/>
                        <path d="M0 756.5H1535" stroke="#FF1864"/>
                        <path d="M0 921.5H1535" stroke="#C4C4C4"/>
                        <path d="M0 850H1535" stroke="#FF1864"/>
                        <path d="M0 1097.5H1535" stroke="#000000"/>
                        <path d="M0 1196.5H1535" stroke="#C4C4C4"/>
                        <path d="M0 1253.5H1535" stroke="#FF1864"/>
                        <path d="M0 1273.5H1535" stroke="#FF1864"/>
                        <path d="M0 1293.5H1535" stroke="#C4C4C4"/>

                        <path d="M0 938.5H1535" stroke="#000000"/>
                        <path d="M0 738.5H1535" stroke="#FFFFFF"/>
                        <path d="M0 338.5H1535" stroke="#FF1864"/>
                    </svg>
                </div>
            </div>
        </React.Fragment>);
}

export function ErrorMessage({reason, onClick}: {reason?: string, onClick: () => void}) {
    return (
        <Alert severity="error" style={{width: "100%", padding: 20, alignItems: "center"}}
                action={<Button onClick={onClick}>TRY AGAIN</Button>}>
            <AlertTitle>Oops! Looks like something went wrong :(</AlertTitle>
            <Box component="span" display="block">{reason}</Box>
        </Alert>
    );
}

const loadingPhrases = [
    'First, you take the dinglepop',
    'You smooth it out with a bunch of schleem',
    'The schleem is then repurposed for later batches',
    'Then you take the dinglebop and push it through the grumbo',
    "It's important that the fleeb is rubbed",
    'A Shlami shows up and he rubs it, and spits on it',
    "There's several hizzards in the way.",
    'The blaffs rub against the chumbles',
    'That leaves you with a regular old plumbus!']

function Phase( {value}: {value: string}) {
    switch (value) {
        case "Pending":
            return <div>Deploying image</div>;
        case "Running":
            return <div>Creating your custom domain</div>;
    }
    return null;
}

export function Loading({phase, retry = 0}: {phase?: string, retry?: number}) {
    const [phrase, setPhrase] = useState(loadingPhrases[0]);
    const [props, set] = useSpring(() => ({opacity: 1}));

    useInterval(() => {
        set({ opacity: 0 });

        setTimeout(function(){ setPhrase(loadingPhrases[Math.floor(Math.random()*loadingPhrases.length)]); }, 500);
        setTimeout(function(){ set({ opacity: 1 }); }, 1000);
    }, 3000);

    return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", textAlign: "center"}}>
            <Typography variant="h3">Please wait, because</Typography>
            <animated.h1 style={props}>{phrase}</animated.h1>
            {(retry > 10) &&
                <div>It looks like it takes longer than expected to load. Please be patient :)</div>}
            {phase &&
                <Phase value={phase} />}
        </div>
    );
}

export function TheiaPanel() {
    const { uuid } = useParams();
    const maxRetries = 5*60;
    const [data, setData] = useState({type: "LOADING"});

    useEffect(() => {
        async function fetchData() {
            const { result } = await getInstanceDetails(localStorage.getItem("userUUID"), uuid);
            const phase = result?.details?.phase;
            if (phase == "Running") {
                // Check URL is fine
                const url = result.url;
                if((await fetchWithTimeout(url)).ok) {
                    setData({type: "SUCCESS", url: url});
                    return;
                }
            }

            const retry = data.retry ?? 0;
            if (retry < maxRetries) {
                setTimeout(() => setData({type: "LOADING", phase: phase, retry: retry + 1}), 1000);
                
            } else if (retry == maxRetries) {
                setData({type: "ERROR", value: "Couldn't access the theia instance", action: () => setData({})});
            }
        }

        if (data.type != "ERROR" && data.type != "SUCCESS") {
            fetchData();
        }
      }, [data, uuid]);

    if(data.type == "SUCCESS") {
        return (
        <div>
            <iframe src={data.url} frameBorder="0" style={{overflow:"hidden",height:"100vh",width:"100vm"}} height="100%" width="100%"></iframe>
        </div>
        );
    } else {
        return <Wrapper state={data} />
    }
}

function Nav() {
    return (
        <AppBar position="fixed">
            <Toolbar style={{justifyContent: "space-between"}}>
                <Typography variant="h6">
                    Playground
                </Typography>
                <IconButton
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSdXpq_fHqS_ow4nC7EpGmrC_XGX_JCIRzAqB1vaBtoZrDW-ZQ/viewform?edit_requested=true")}
                    color="inherit"
                >
                    <FeedbackIcon />
                </IconButton>
            </Toolbar>
        </AppBar>
    );
}

function TemplateSelector({templates, onSelect, onRetryClick, state}) {
    const [selection, select] = useState(templates[0]);
    const templatesAvailable = templates?.length > 0;
    return (
    <React.Fragment>
        <Typography variant="h5" style={{padding: 20}}>Select a template</Typography>
        <Divider orientation="horizontal" />
        <Container style={{display: "flex", flex: 1, padding: 0, alignItems: "center", overflowY: "auto"}}>
            {(!state.matches(failed) && templatesAvailable)
                ? <div style={{display: "flex", flex: 1, flexDirection: "row", minHeight: 0, height: "100%"}}>
                    <List style={{paddingTop: 0, paddingBottom: 0, overflowY: "auto"}}>
                        {templates.map((template, index: number) => (
                        <ListItem button key={index} onClick={() => select(template)}>
                            <ListItemText primary={template.name} />
                        </ListItem>
                        ))}
                    </List>
                    <Divider flexItem={true} orientation={"vertical"} light={true} />
                    {selection &&
                    <Typography component="div" style={{width: "100%", marginLeft: 20, overflow: "auto", textAlign: "left"}}>
                        <div dangerouslySetInnerHTML={{__html:marked(selection.description)}}></div>
                    </Typography>}
                </div>
                : <ErrorMessage reason={"Can't find any template. Is the templates configuration incorrect."} onClick={onRetryClick} />
            }
        </Container>
        <Divider orientation="horizontal" />
        <Container style={{display: "flex", flexDirection: "column", alignItems: "flex-end", paddingTop: 10, paddingBottom: 10}}>
            <Button onClick={() => onSelect(selection.id)} color="primary" variant="contained" disableElevation disabled={!templatesAvailable || state.matches(failed)}>
                Create
            </Button>
        </Container>
    </React.Fragment>
    );
}

function EnvTable({envs}) {
    return (
    <TableContainer component={Paper}>
        <Table size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {envs.map((env) => (
              <TableRow key={env.name}>
                <TableCell component="th" scope="row">
                  {env.name}
                </TableCell>
                <TableCell align="right">{env.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
}

function PortsTable({ports}) {
    return (
    <TableContainer component={Paper}>
        <Table size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ports.map((port) => (
              <TableRow key={port.name}>
                <TableCell component="th" scope="row">
                  {port.name}
                </TableCell>
                <TableCell>{port.path}</TableCell>
                <TableCell>{port.port}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
}

function formatDate(t: number) {
    try {
        return new Date(1000*t).toISOString();
    } catch {
    }
}

function Instance({instance}) {
    const {instance_uuid, details, template} = instance;
    const {name, runtime} = template;
    const {env, ports} = runtime;
    const date = formatDate(details?.started_at?.secs_since_epoch);
    return (
    <Card style={{ margin: 20, alignSelf: "baseline"}} variant="outlined">
        <CardContent>
            <Typography>
            {name} ({instance_uuid})
            </Typography>
            {date &&
            <Typography color="textSecondary" gutterBottom>
            Started at {date}
            </Typography>
            }
            <Typography color="textSecondary" gutterBottom>
            Phase: <em>{details.phase}</em>
            </Typography>
            <div style={{display: "flex", paddingTop: 20}}>
                <div style={{flex: 1, paddingRight: 10}}>
                    <Typography variant="h6" id="tableTitle" component="div">
                    Environment
                    </Typography>
                    <EnvTable envs={env} />
                </div>
                <div style={{flex: 1}}>
                    <Typography variant="h6" id="tableTitle" component="div">
                    Ports
                    </Typography>
                    <PortsTable ports={ports} />
                </div>
            </div>
        </CardContent>
    </Card>
    );
}

function ExistingInstances({instances, onStopClick, onConnectClick}) {
     // A single instance per user is supported for now
    const instance = instances[0];
    return (
    <React.Fragment>
        <Typography variant="h5" style={{padding: 20}}>Running instance</Typography>
        <Divider orientation="horizontal" />
        <Container style={{display: "flex", flex: 1, padding: 0, justifyContent: "center", overflowY: "auto"}}>
            <Instance instance={instance} />
        </Container>
        <Divider orientation="horizontal" />
        <Container style={{display: "flex", flexDirection: "column", alignItems: "flex-end", paddingTop: 10, paddingBottom: 10}}>
            <div>
                <Button style={{marginRight: 10}} onClick={() => onStopClick(instance)} color="secondary" variant="outlined" disableElevation>
                    Stop
                </Button>
                <Button onClick={() => onConnectClick(instance)} color="primary" variant="contained" disableElevation>
                    Connect
                </Button>
            </div>
        </Container>
    </React.Fragment>
    );
}

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>,
  ) {
    return <Zoom direction="up" ref={ref} {...props} />;
  });

export function MainPanel({ history, location }) {
    const [state, send] = useLifecycle(history, location);
    const [hoverRef, isHovered] = useHover();

    const {instances, templates} = state.context;
    const runningInstances = instances?.filter(instance => instance?.details?.phase === "Running");

    function gstate() {
        if (state.matches(setup) || state.matches(stopping) || state.matches(deploying)) {
            return {type: "LOADING"};
        } else if (state.matches(failed)) {
            return {type: "ERROR", value: state.context.error,  action: () => send(restart)};
        } else if (isHovered) {
            return {type: "PRELOADING"};
        } else {
            if (!(runningInstances?.length + templates?.length > 0)) {
                return {type: "ERROR", value: "No templates", action: () => send(restart)};
            }
        }
    }

    function content() {
        if (state.matches(initial)) {
            if (runningInstances?.length > 0) {
                return <ExistingInstances onConnectClick={(instance) => history.push(`/${instance.instance_uuid}`)} onStopClick={(instance) => send(stop, {instance: instance})} instances={runningInstances} />;
            } else {
                return <TemplateSelector state={state} templates={templates} onRetryClick={() => send(restart)} onSelect={(template) => send(deploy, {template: template})} onErrorClick={() => send(restart)} />;
            }
        }
    }

    const conten = content();
    return (
        <Wrapper state={gstate()}>
            {conten &&
            <Container style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
                <Paper ref={hoverRef} style={{display: "flex", flexDirection: "column", height: "60vh", width: "60vw"}} elevation={3}>
                {conten}
                </Paper>
            </Container>
            }
        </Wrapper>
    );
}

function WrappedContent({ style, state, content }) {
    switch(state?.type) {
        case "ERROR":
            const { value, action } = state;
            return (
            <Container style={{display: "flex", alignItems: "center", height: "100vh"}}>
                <ErrorMessage reason={value || "Unknown error"} onClick={action} />
            </Container>
            );
        case "LOADING":
            const { phase, retry } = state;
            return <Loading phase={phase} retry={retry} />;
        default:
            return <div style={style}>{content}</div>;
    }
}

// state: PRELOADING, LOADING, ERROR (message, action) {type: value:}
export function Wrapper({ state, children }) {
    const type = state?.type;
    return (
    <React.Fragment>
        <Background state={type} />

        <Nav />

        <Fade in appear>
            <WrappedContent state={state} content={children} />
        </Fade>

    </React.Fragment>
    );
}