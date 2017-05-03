#!/bin/bash

REPOSITORY=$1
PR_NUMBER=$2
FILENAME=$3
REPO_FOLDER=$(basename $REPOSITORY)

OLD_PWD=$PWD

# fetch the repository 
mkdir -vp /tmp/test-merge/
cd /tmp/test-merge

if [ -e $REPO_FOLDER ] 
then
    # FIXME: we may want to use the cached version, but that may not be the
    # easiest way
    echo "found old version of the repo... cleaning"
    rm -rf $REPO_FOLDER
fi

git clone $REPOSITORY

cd $REPO_FOLDER
# make our merge-benchmark folder
mkdir .mergebenchmark


# save the master version of the file
cp $FILENAME .mergebenchmark/${FILENAME}-master

# save the refs that we need
git remote-https "$REPOSITORY" <<< list > .github-refs

# checkout to the target branch
git checkout -b mergecommit
PR_HEAD=$(cat .github-refs | grep "refs/pull/${PR_NUMBER}/merge" | cut -d ' ' -f 1)
#git reset --hard "$PR_HEAD"
#cp $FILENAME .mergebenchmark/${FILENAME}
curl -L https://api.github.com/repos/jkbrzt/httpie/pulls/497 > .mergeinfo
MERGEINFO=$(python << EOF
import json
with open('.mergeinfo') as fp:
  repodata = json.load(fp)

print("{} {}".format(repodata['head']['ref'], repodata['head']['repo']['html_url']))
EOF
)
REMOTE_REF=$(echo $MERGEINFO | cut -d ' ' -f 1)
REMOTE_URL=$(echo $MERGEINFO | cut -d ' ' -f 2)
git remote add merge-remote $REMOTE_URL 
git fetch merge-remote $REMOTE_REF
git reset --hard merge-remote/$REMOTE_REF
cp $FILENAME .mergebenchmark/${FILENAME}

# get the merge base
git checkout -b merge-base 
MERGE_BASE=$(git merge-base HEAD master)
git reset --hard ${MERGE_BASE}
cp $FILENAME .mergebenchmark/${FILENAME}-base

# compute the merge
git checkout master
git merge -q -m "merging commit" mergecommit
cp $FILENAME .mergebenchmark/${FILENAME}-result

# change-back to ourselves and compute the merge
cd $OLD_PWD
./git-merge-file.js -p /tmp/test-merge/${REPO_FOLDER}/.mergebenchmark/${FILENAME}{-master,-base,} > .result
cp .result /tmp/test-merge/${REPO_FOLDER}/.mergebenchmark/${FILENAME}-result2

echo "these two files should have the same hash :)"
sha256sum /tmp/test-merge/${REPO_FOLDER}/.mergebenchmark/${FILENAME}-result*
