import React, { Component } from 'react'
import { LoadingIndicator, TagsInput } from 'components/BasicComponents'

import { Card, CardActions, CardText, CardTitle } from 'material-ui/Card'
import MediaQuery from 'react-responsive'
import Paper from 'material-ui/Paper'
import { Divider, FlatButton } from 'material-ui'
import FileDownloadIcon from 'material-ui/svg-icons/file/file-download'
import DeleteIcon from 'material-ui/svg-icons/action/delete'
import UndoIcon from 'material-ui/svg-icons/content/undo'
import DetailedCardHeader from './components/DetailedCardHeader'
import { files } from 'utils/'
import 'whatwg-fetch'

import classes from './DetailedCard.scss'

class DetailedCard extends Component {

    constructor(props) {
        super(props);

        this.state = {
            ...props,
            fileTextContent: undefined,
            filePageNumbers: {},
        };

        this.getPageNumber = this.getPageNumber.bind(this);
        this.getPageNumbers = this.getPageNumbers.bind(this);
        this.processPage = this.processPage.bind(this);
        this.getFileAsText = this.getFileAsText.bind(this);
        this.fetchFileTextContents = this.fetchFileTextContents.bind(this);
        this.getHits = this.getHits.bind(this);
    }

    // Methods

    startLoadingHighlight() {
        const { searchQuery, hit: { file_id: fileId }, loadHighlight } = this.props
        loadHighlight(fileId, searchQuery)
    }

    openPdfAtPageNumber(i, e) {
      e.preventDefault();

      return this.getFileAsBlob().then(res => {
        this.showFile(res);
      });
    }

    getPageNumber(i, e) {
        e.preventDefault();

        const hits = this.getHits();
        const hit = hits[i];

        return this.getFileAsText().then(res => {
          this.processPage(res, [hit], i);
      });
    }

    getPageNumbers(e, hits = undefined) {
        e.preventDefault();

        return this.getFileAsText().then(res => {
            this.processPage(res, hits);
        });
    }

    processPage(text, input = undefined, i = undefined) {
        let hits = input;

        if (hits === undefined) {
            hits = this.getHits();
        }

        // Hold as an object so we can insert at indexes
        let numbers = {...this.lookupHits(hits, text)};

        if (i && numbers[0]) {
          numbers = {
            [i]: numbers[0]
          }
        }

        this.setState({
          filePageNumbers: {
            ...this.state.filePageNumbers,
            ...numbers
          }
        });

        return numbers;
    }

    getFileAsText() {
        // Use text content already in state if possible
        if (this.state.fileTextContent) {
            return new Promise(resolve => {
                resolve(this.state.fileTextContent);
            });
        }

        // Otherwise, fetch it
        const req = this.fetchFileTextContents();

        if (!req) { return new Promise(res => res(false)); }

        return req.then((res) => {
            const clean = this.cleanText(res);

            this.setState({
                fileTextContent: clean,
            });

            return clean;
        })
    }

    getFileAsBlob() {
        const req = this.fetchFileBlobContents();

        if (!req) { return new Promise(res => res(false)); }

        return req.then((res) => {
            return res;
        })
    }

    fetchFileTextContents() {
        const uri = this.props.urls.ambarWebApiGetFileText(this.props.hit.meta.download_uri);

        return fetch(uri, {
            method: 'GET',
            headers: [
                ["Content-Type", "text/plain"]
            ]
        }).then((resp) => {
            if (resp.status == 200) {
                return resp.text();
            } else {
                throw resp;
            }
        });
    }

    fetchFileBlobContents() {
      const uri = this.props.downloadUri;

      if (!uri) {
        return false;
      }

      return fetch(uri, {
          method: 'GET',
      }).then((resp) => {
        if (resp.status == 200) {
          return resp.blob();
      } else {
          throw resp;
      }
      });
  }

    constructRegex(str) {
        let pattern = '.[\\s\\S]*?END PAGE #([0-9]*)';
        pattern = pattern.replace('.', str);

        return new RegExp(pattern, 'gm');
    }

    cleanStr(str) {
        let r = str;

        r = r.replace(new RegExp(/\r?\n|\r/gm), '');
        r = r.replace(new RegExp(/\s/g), ' ');

        return r;
    }

    cleanText(txt) {
        let r = this.cleanStr(txt);

        r = r.replace(new RegExp(/ +(?= )/gm),'');

        return r;
    }

    cleanHit(hit) {
        let r = this.cleanStr(hit);

        const remove = ['<br\\/>', '<em>', '<\\/em>'];
        // const escape = ['.', '?', '*', '(', ')', '|', '+'];

        // Refine the search term to not span multiple pages
        r = this.refineHit(r);

        // Escape regex conflicting characters
        r = this.regexSanitize(r);

        // After using the em-tags during refine remove them
        r = this.regexRemove(remove, r);

        return r;
    }

    // src: https://stackoverflow.com/a/9310752
    regexSanitize(input) {
      return input.replace(new RegExp(/[-[\]{}()*+?.,\\^$|#\s]/, 'gm'), '\\$&');
    }

    regexRemove(needles, haystack) {
        const re = new RegExp(needles.join('|'), 'g');
        const r = haystack.replace(re, '');

        return r;
    }

    // Unused
    // regexEscape(needles, haystack) {
    //     let r = haystack;

    //     // Make sure each needle has at least one matching group. $1 will be the value of that group
    //     needles.forEach(needle => {
    //         const base = '(\\.)';
    //         const pattern = base.replace('.', needle)
    //         const re = new RegExp(pattern, 'g');
    //         r = r.replace(re, '\\$1');
    //     });

    //     return r;
    // }

    refineHit(hit) {
        let r = hit;

        // Look for everything before the first "--END PAGE #" directly after any <em> tags
        const re = new RegExp(/([\s\S]*?<em>[\s\S]*?<\/em>[\s\S]*?)---END PAGE #[0-9]*/gm);
        const found = re.exec(r);

        if (found && found.length === 2) {
            r = found[1]; // first group
        }

        return r;
    }

    lookupHits(hits, text) {
        return hits.map(hit => {
            let r = undefined;

            const clean = this.cleanHit(hit);
            const re = new RegExp(this.constructRegex(clean));
            const res = re.exec(text);

            if (res && res.length === 2) {
                const index = res[1];

                r = index;
            }

            if (!r) { console.warn('Page Index resolved to false', {clean, re, res}) }

            return r;
        });
    }

    getHits(content = undefined) {
        let r = [];

        if (content === undefined) {
            content = this.props.hit && this.props.hit.content ? this.props.hit.content : undefined;
        }

        if (content && content.highlight && content.highlight.text) {
          r = content.highlight.text;
        }

        return r;
    }

    showFile(blob){
        // It is necessary to create a new blob object with mime-type explicitly set
        // otherwise only Chrome works like it should
        var newBlob = new Blob([blob], {type: "application/pdf"})

        // IE doesn't allow using a blob object directly as link href
        // instead it is necessary to use msSaveOrOpenBlob
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(newBlob);
            return;
        }

        // For other browsers:
        // Create a link pointing to the ObjectURL containing the blob.
        const data = window.URL.createObjectURL(newBlob);

        var link = document.createElement('a');
        link.href = data;
        link.download="file.pdf";
        link.click();

        setTimeout(function(){
            // For Firefox it is necessary to delay revoking the ObjectURL
            window.URL.revokeObjectURL(data);
        }, 100);
    }

    // Lifecycle

    componentDidUpdate(prevProps) {
      // Reset our page numbers and file content when the query or the amount of results change
      if (prevProps.searchQuery !== this.props.searchQuery || this.getHits(prevProps.hit.content).length !== this.getHits().length) {
        this.setState({
          filePageNumbers: {},
          fileTextContent: undefined
        })
      }
    }

    render() {
        const {
            hit: {
                fetching: fetching,
                meta: meta,
                content: content,
                sha256: sha256,
                tags: tags,
                file_id: fileId,
                isHidden: isHidden,
                hidden_mark: hidden_mark
            },
            allTags,
            thumbnailUri,
            downloadUri,
            searchQuery,
            loadHighlight,
            performSearchByAuthor,
            performSearchByPathToFile,
            toggleImagePreview,
            addTagToFile,
            removeTagFromFile,
            performSearchByTag,
            hideFile,
            showFile,
            localization,
            preserveOriginals,
            textUri,
            fileTextContent,
            filePageNumber
        } = this.props

        const contentHighlight = this.getHits(content);

        return (
            <Paper zDepth={1} className={classes.searchResultRowCard}>
                <Card>
                    <DetailedCardHeader
                        searchQuery={searchQuery}
                        meta={meta}
                        content={content}
                        performSearchByPathToFile={performSearchByPathToFile}
                        performSearchByAuthor={performSearchByAuthor}
                        localization={localization}
                    />
                    {!isHidden && <div>
                        <TagsInput
                            tags={tags}
                            onAddTag={(tagType, tagName) => addTagToFile(fileId, tagType, tagName)}
                            onRemoveTag={(tagType, tagName) => removeTagFromFile(fileId, tagType, tagName)}
                            performSearchByTag={performSearchByTag}
                            suggestions={allTags.map(t => t.name)}
                        />
                        <div className={classes.searchResultRowCardTextContainer}>
                            <div className={classes.searchResultRowCardTextDiv}>
                                {fetching && <CardText>
                                    <LoadingIndicator />
                                </CardText>
                                }
                                {!fetching && !contentHighlight &&
                                    <CardText onMouseEnter={() => this.startLoadingHighlight()}>
                                        <span className={classes.blurred}>Если у общества нет цветовой дифференциации штанов - то у общества</span><br />
                                        <span className={classes.blurred}>нет цели, а если нет цели - то...</span>
                                    </CardText>
                                }
                                {!fetching && contentHighlight && contentHighlight.map((hl, idx) =>
                                    <section
                                        key={idx}
                                        className={classes.searchResultRowCardTextWithBorder}>
                                            <button onClick={this.getPageNumber.bind(this, idx)}>Which page is this on?</button>
                                            <button onClick={this.openPdfAtPageNumber.bind(this, idx)}>Open</button>

                                            <p><b>Page Number:</b> {this.state.filePageNumbers[idx]}</p>
                                            <p><b>Page URL:</b> {this.state.filePageNumbers[idx]}</p>

                                            <CardText dangerouslySetInnerHTML={{ __html: hl }}/>
                                    </section>
                                )}
                            </div>
                            {!fetching && contentHighlight && content.thumb_available &&
                                <MediaQuery query='(min-width: 1024px)'>
                                    <div className={classes.searchResultRowCardTextThumbnailContainer} >
                                        <img onTouchTap={() => { toggleImagePreview(thumbnailUri) }}
                                            className={classes.searchResultRowCardTextThumbnailImage}
                                            src={thumbnailUri} />

                                        <button onClick={this.getPageNumbers}>Get all page numbers</button>

                                        <pre>{JSON.stringify(this.state.filePageNumbers)}</pre>
                                    </div>
                                </MediaQuery>
                            }
                        </div>
                    </div>}
                    <CardActions className={classes.searchResultRowCardFooter}>
                        <div style={{ display: 'flex', justifyContent: !isHidden ? 'space-between' : 'flex-end', width: '100%' }}>
                            {!isHidden && !hidden_mark && meta.source_id != 'ui-upload' && !meta.extra.some(item => item.key === 'from_container') && <div>
                                <FlatButton
                                    icon={<FileDownloadIcon />}
                                    label={localization.searchPage.downloadLabel}
                                    title={localization.searchPage.downloadDescriptionLabel}
                                    primary={true}
                                    onTouchTap={() => { window.open(downloadUri) }}
                                />
                            </div>}
                            <div>
                                {!hidden_mark && <FlatButton
                                    icon={<DeleteIcon />}
                                    secondary={true}
                                    label={localization.searchPage.removeLabel}
                                    title={localization.searchPage.removeDescriptionLabel}
                                    style={{ color: 'grey' }}
                                    onTouchTap={() => hideFile(fileId)}
                                />}
                            </div>
                        </div>}
                    </CardActions>
                </Card>
            </Paper>
        )
    }
}


DetailedCard.propTypes = {
    hit: React.PropTypes.object.isRequired,
    allTags: React.PropTypes.array.isRequired,
    searchQuery: React.PropTypes.string.isRequired,
    thumbnailUri: React.PropTypes.string.isRequired,
    downloadUri: React.PropTypes.string.isRequired,
    loadHighlight: React.PropTypes.func.isRequired,
    performSearchByAuthor: React.PropTypes.func.isRequired,
    performSearchByPathToFile: React.PropTypes.func.isRequired,
    toggleImagePreview: React.PropTypes.func.isRequired,
    addTagToFile: React.PropTypes.func.isRequired,
    removeTagFromFile: React.PropTypes.func.isRequired,
    performSearchByTag: React.PropTypes.func.isRequired,
    hideFile: React.PropTypes.func.isRequired,
    showFile: React.PropTypes.func.isRequired,
    localization: React.PropTypes.object.isRequired,
    preserveOriginals: React.PropTypes.bool.isRequired
}

export default DetailedCard




