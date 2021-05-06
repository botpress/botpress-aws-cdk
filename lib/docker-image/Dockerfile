FROM botpress/server:v12_21_1

RUN mkdir -p /botpress/lang
RUN wget -q -P /botpress/lang/ http://botpress-public.nyc3.digitaloceanspaces.com/embeddings/bp.en.bpe.model
RUN wget -q -P /botpress/lang/ http://botpress-public.nyc3.digitaloceanspaces.com/embeddings/bp.en.300.bin
