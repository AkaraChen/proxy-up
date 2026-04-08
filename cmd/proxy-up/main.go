package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	switch len(args) {
	case 0:
		return runForeground()
	case 1:
		switch args[0] {
		case "install":
			return runInstallCommand()
		case "uninstall":
			return runUninstallCommand()
		case "start":
			return runStartCommand()
		case "stop":
			return runStopCommand()
		case "run":
			return runServiceCommand()
		case "help", "-h", "--help":
			printUsage()
			return nil
		}
	}

	printUsage()
	return fmt.Errorf("unknown command: %q", args[0])
}

func runForeground() error {
	app, err := newProxyUpApp()
	if err != nil {
		return err
	}
	if err := app.Start(true); err != nil {
		return err
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	return app.Stop()
}

func printUsage() {
	fmt.Fprintf(os.Stderr, `Usage:
  proxy-up           Run proxy-up in the foreground
  proxy-up install   Install the user service for auto-start
  proxy-up uninstall Stop and remove the user service
  proxy-up start     Install the user service if needed and start it
  proxy-up stop      Stop the user service
  proxy-up run       Internal command used by the service manager
`)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		return
	}
	_ = cmd.Start()
}
