Springbok Documentation
===

## Hosting

This application is hosted on AWS, relevant __credentials can only be requested from AWS Administrators__. Currently this is Ian Emsens and John Deprez.

The application is hosted on a `t2.small` EC2 instance which is configured to have multiple security groups which allow inbound tcp traffic on the following ports:

- `22` - SSH
- `80` - HTTP
- `443` - HTTPS
- `8080` - Application API

An `Elastic IP` is set up to ensure the `IPv4` address remains __static__ across restarts of the instance.

## Deployment

__No automated deploys have been set up__. Meaning you won't be able to find the deploy definiton on Envoyer or anything of the sort.

Instead, deployments are done manually by using SSH to access the machine. Below are the steps you should take to update the application. I refer to parts of the application by their service name as defined in `docker-compose.yml`

- `$ cd ambar`
- `$ git pull origin master`
- Run local builds on parts you've changed
  - e.g. `frontend` requires a local build to be done which comes down to:
    - `$ cd FrontEnd`
    - `$ nvm install`
    - `$ npm install`
    - `$ npm run build`
- `$ docker-compose build <service-name>`
  - Make sure you're in the folder containing the `docker-compose.yml` file when running this
- `$ docker-compose restart <service-name>`
  - If you don't see changes propogated use: `$ docker-compose down && docker-compose up -d`

If nothing broke along the way you should now have a functional and updated Ambar project, check below for help troubleshooting and some useful commands.

## Troubleshooting

In general, the below commands should allow you to troubleshoot most issues in this setup

- `$ docker stats`
  - shows a list of all running containers on the docker daemon and shows their __memory and CPU usage__
- `$ docker-compose build`
  - builds or rebuilds all containers
- `$ docker-compose up`
  - will start or build and start all services defined in `docker-compose.yml`
  - __Tip:__ use `-d` to run this command in detached mode (allows you to close your terminal without killing the application)
- `$ docker-compose down`
  - does the inverse of `$docker-compose up`
- `$ docker-compose ps`
  - shows a list of all running containers managed by the docker-compose file in your current directory. This list contains information about __service health__
- `$ docker-compose logs`
  - will show all logging information normally shown by `$ docker-compose up`


#### ElasticSearch

When the `es` service is consistently restarting, check its memory usage using `$ docker stats` and then check `$ docker-compose logs` and look for the below error

```
es_1 | ERROR: [1] bootstrap checks failed
es_1 | [1]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
```

Resolve this by following instructions in [this issue](https://github.com/docker-library/elasticsearch/issues/111). This setting resets upon instance restart.

__Note:__ this can most likely be made into an automated process within AWS

Ambar Documentation
===

[![Version](https://img.shields.io/badge/Version-v2.1.19-brightgreen.svg)](https://ambar.cloud)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/RD17/ambar/blob/master/License.txt)

Ambar: Document Search Engine
================================

![Ambar Search](https://ambar.cloud/img/search.gif)

Ambar is an open-source document search engine with automated crawling, OCR, tagging and instant full-text search.

Ambar defines a new way to implement a full-text document search into yor workflow:
- Easily deploy Ambar with a single `docker-compose` file
- Perform a Google-like search through your documents and images contents
- Ambar supports all popular document formats, performs OCR if needed
- Tag your documents
- Use a simple REST Api to integrate Ambar into your workflow

## Features

### Search
[Tutorial: Mastering Ambar Search Queries](https://ambar.cloud/blog/2017/03/24/mastering-search-queries/)

* Fuzzy Search (John~3)
* Phrase Search ("John Smith")
* Search By Author (author:John)
* Search By File Path (filename:\*.txt)
* Search By Date (when: yesterday, today, lastweek, etc)
* Search By Size (size>1M)
* Search By Tags (tags:ocr)
* Search As You Type
* Supported language analyzers: English `ambar_en`, Russian `ambar_ru`, German `ambar_de`, Italian `ambar_it`, Polish `ambar_pl`, Chinese `ambar_cn`, CJK `ambar_cjk`

### Crawling

Ambar 2.0 only supports local fs crawling, if you need to crawl an SMB share of an FTP location - just mount it using standard linux tools.
Crawling is automatic, no schedule is needed since the crawler monitors fs events and automatically processes new files.

### Content Extraction

* Ambar supports large files (>30MB)
* ZIP archives
* Mail archives (PST)
* MS Office documents (Word, Excel, Powerpoint, Visio, Publisher)
* OCR over images
* Email messages with attachments
* Adobe PDF (with OCR)
* OCR languages: Eng, Rus, Ita, Deu, Fra, Spa, Pl, Nld
* OpenOffice documents
* RTF, Plaintext
* HTML / XHTML
* Multithread processing

## Installation

**Notice**: Ambar requires Docker to run, it can't run w/o Docker

You can build Docker images by yourself or buy prebuilt Docker images for **$50** [here](https://ambar.cloud/pricing/).

* The installation instruction for prebuilt images can be found [here](https://ambar.cloud/docs/installation/)
* Tutorial on how to build images from scratch will be available soon

If you want to see how Ambar works w/o installing it, try our [live demo](https://app.ambar.cloud/). No signup required.

## Building the images yourself

All of the images required to run Ambar can be built by the user. In general, each image can be built by navigating into the directory of the component in question, performing any compilation steps required, then building the image like so:

```
# From project root
$ cd FrontEnd
$ docker build . -t <image_name>
```

The resulting image can be referred to by the name specified, and run by the containerization tooling of your choice.

In order to use a local Dockerfile with `docker-compose`, simply change the `image` option to `build`, setting the value to the relative path of the directory containing the dockerfile. Then run `docker-compose build` to build the relevant images. For example:

```
# docker-compose.yml from project root, referencing local dockerfiles
pipeline0:
  build: ./Pipeline/
image: chazu/ambar-pipeline
  localcrawler:
    image: ./LocalCrawler/
```

Note that some of the components require compilation or other build steps be performed _on the host_ before the docker images can be built. For example, `FrontEnd`:

```
# Assuming a suitable version of node.js is installed (docker uses 8.10)
$ npm install
$ npm run compile
```

## FAQ
### Is it open-source?
Yes, it's fully open-source.

### Is it free?
Yes, it is forever free and open-source.

### Does it perform OCR? 
Yes, it performs OCR on images (jpg, tiff, bmp, etc) and PDF's. OCR is perfomed by well-known open-source library Tesseract. We tuned it to achieve best perfomance and quality on scanned documents. You can easily find all files on which OCR was perfomed with `tags:ocr` query

### Which languages are supported for OCR?
Supported languages: Eng, Rus, Ita, Deu, Fra, Spa, Pl, Nld.
If you miss your language please contact us on hello@ambar.cloud.

### Does it support tagging?
Yes!

### What about searching in PDF?
Yes, it can search through any PDF, even badly encoded or with scans inside. We did our best to make search over any kind of pdf document smooth.

### What is the maximum file size it can handle?
It's limited by amount of RAM on your machine, typically it's 500MB. It's an awesome result, as typical document managment systems offer 30MB maximum file size to be processed.  

### I have a problem what should I do?
Request a dedicated support session by mailing us on hello@ambar.cloud

## Sponsors

- [IFIC.co.uk](http://www.ific.co.uk/)

## Change Log
[Change Log](https://github.com/RD17/ambar/blob/master/CHANGELOG.md)

## Privacy Policy
[Privacy Policy](https://github.com/RD17/ambar/blob/master/privacy-policy.md)

## License
[MIT License](https://github.com/RD17/ambar/blob/master/license.txt)


