package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/squat/berlinstrength/api"
	"github.com/squat/berlinstrength/version"

	"github.com/prometheus/client_golang/prometheus"
	pversion "github.com/prometheus/common/version"
	"github.com/sirupsen/logrus"
	flag "github.com/spf13/pflag"
)

func main() {
	flags := struct {
		clientSecret string
		clientID     string
		emails       string
		file         string
		logLevel     string
		port         int
		url          string
		version      bool
	}{
		clientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		clientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		emails:       "",
		file:         "",
		logLevel:     "info",
		port:         8080,
		url:          "http://localhost:8080",
		version:      false,
	}
	flag.StringVar(&flags.clientID, "client-id", flags.clientID, "OAuth client secret")
	flag.StringVar(&flags.clientSecret, "client-secret", flags.clientSecret, "OAuth client secret")
	flag.StringVarP(&flags.emails, "emails", "e", flags.emails, "comma-separated list of allowed emails")
	flag.StringVarP(&flags.file, "file", "f", flags.file, "file path to RFID scanner; leave empty to read from stdin")
	flag.StringVarP(&flags.logLevel, "loglevel", "l", flags.logLevel, "logging verbosity")
	flag.IntVarP(&flags.port, "port", "p", flags.port, "port on which to listen")
	flag.StringVarP(&flags.url, "url", "u", flags.url, "redirect URL to use for OAuth")
	flag.BoolVarP(&flags.version, "version", "v", flags.version, "print version and exit")
	flag.Parse()

	if len(os.Args) > 1 {
		command := os.Args[1]
		if flags.version || command == "version" {
			fmt.Println(version.Version)
			return
		}
	}

	level, err := logrus.ParseLevel(flags.logLevel)
	if err != nil {
		logrus.Fatalf("%q is not a valid log level", flags.logLevel)
	}
	logrus.SetLevel(level)

	if flags.clientID == "" {
		logrus.Fatalf("The %q flag is required", "--client-id")
	}
	if flags.clientSecret == "" {
		logrus.Fatalf("The %q flag is required", "--client-secret")
	}

	f := os.Stdin
	if flags.file != "" {
		f, err = os.Open(flags.file)
		if err != nil {
			logrus.Fatalf("Could not open the RFID scanner located at %q: %v", flags.file, err)
		}
	}
	u, err := url.Parse(flags.url)
	if err != nil {
		logrus.Fatalf("%q is not a valid URL", "flags.url")
	}
	if u.Scheme == "" {
		u.Scheme = "https"
	}
	cfg := api.Config{
		ClientID:     flags.clientID,
		ClientSecret: flags.clientSecret,
		Emails:       strings.Split(flags.emails, ","),
		File:         f,
		URL:          &url.URL{Host: u.Host, Scheme: u.Scheme},
	}

	reg := prometheus.NewRegistry()
	reg.MustRegister(
		pversion.NewCollector("observatorium"),
		prometheus.NewGoCollector(),
		prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
	)

	logrus.Infof("Starting Server listening on :%d\n", flags.port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", flags.port), api.New(&cfg, reg, reg)); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
