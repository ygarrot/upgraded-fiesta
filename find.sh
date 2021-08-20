# ag --nofilename -o0 -R ">([^<\n].*)<" --html | sed 's/>//g' | sed 's/<.*//g'
# rg --json -i '[^:]placeholder="([^"])*"' src >test.json

# for file in `find ./src -name "*.html"`; do
# 	cat $file | ./html-to-text | ag "\S" | sed 's/\[.*\]//g'
# done

# sort all | uniq -du > filter

echo '['
while read p; do
  rg --json -U -i ">\s*?$p" -g '*.html' src/
done <filter
echo ']'
